/**
 * utils/salaryRevisionHelper.js
 *
 * Shared utility functions for the Salary Revision module.
 *
 * Key export: getCTCForMonth(employeeId, month, year)
 * ─────────────────────────────────────────────────────
 * Returns the CTC snapshot that was effective for a given calendar month.
 * This is the core function that makes backdated salary slips work correctly.
 *
 * Strategy:
 *   1. Load the employee's current EmployeeCTC (has `history` array + `effectiveDate`).
 *   2. Load all SalaryRevision records for this employee sorted by effectiveDate ASC.
 *   3. Find the latest revision whose effectiveDate ≤ last day of the target month.
 *   4. If a revision is found that is OLDER than the current active CTC revision, 
 *      use the snapshot from that revision.
 *   5. If no such revision exists (target month is before any revision), use the
 *      oldest known CTC from the history array.
 *
 * This means:
 *  - August slip generated before a September revision → uses pre-revision CTC ✓
 *  - August slip generated AFTER a backdated August revision → uses new CTC ✓
 *  - September slip after backdated August revision → uses new CTC ✓
 */

import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import SalaryRevision from '../models/SalaryRevision.Model.js';
import SalarySlip from '../models/SalarySlip.Model.js';

/**
 * Returns the CTC that was "in effect" for the given month/year.
 *
 * @param {ObjectId|string} employeeId
 * @param {number} month  - 1..12
 * @param {number} year   - e.g. 2025
 * @returns {Object|null} - A plain object shaped like an EmployeeCTC document,
 *                          or null if no CTC exists at all.
 */
export const getCTCForMonth = async (employeeId, month, year) => {
    // Target: last moment of the target month
    const lastDayOfMonth = new Date(year, month, 0); // day 0 of next month = last day of this month
    lastDayOfMonth.setHours(23, 59, 59, 999);

    // First day of the target month
    const firstDayOfMonth = new Date(year, month - 1, 1);

    // Get the current EmployeeCTC record (has the current snapshot + history)
    const currentCTC = await EmployeeCTC.findOne({ employeeId });
    if (!currentCTC) return null;

    // Get ALL applied SalaryRevision records for this employee, sorted by effectiveDate ASC
    const revisions = await SalaryRevision.find({
        employeeId,
        status: 'Applied'
    }).sort({ effectiveDate: 1 });

    if (!revisions.length) {
        // No revisions ever — the current CTC is the only one, use it
        return currentCTC;
    }

    // Find the most recent revision whose effectiveDate falls on or before the end of target month
    // i.e., "which revision was active as of the last day of target month?"
    let applicableRevision = null;
    for (const rev of revisions) {
        if (new Date(rev.effectiveDate) <= lastDayOfMonth) {
            applicableRevision = rev;  // keep overwriting to get the latest one ≤ month-end
        }
    }

    if (!applicableRevision) {
        // Target month is BEFORE any revision was applied.
        // Use the oldest known salary from CTC history.
        if (currentCTC.history && currentCTC.history.length > 0) {
            // History is sorted oldest-first (pushed in order)
            const oldest = currentCTC.history[0];
            return buildCTCSnapshot(oldest, currentCTC);
        }
        // No history either — return current (best we can do)
        return currentCTC;
    }

    // The applicable revision is the one that was active at month-end.
    // Return its "new" (post-revision) snapshot as the CTC for that month.
    return buildRevisionCTCSnapshot(applicableRevision, currentCTC);
};

/**
 * Builds a CTC-shaped object from a SalaryRevision's "new" snapshot.
 */
const buildRevisionCTCSnapshot = (revision, currentCTC) => {
    return {
        _id: currentCTC._id,
        employeeId: currentCTC.employeeId,
        adminId: currentCTC.adminId,
        annualCTC: revision.newAnnualCTC,
        monthlyGross: revision.newMonthlyGross,
        netSalary: revision.newNetSalary,
        earnings: revision.newEarnings,
        deductions: revision.newDeductions,
        effectiveDate: revision.effectiveDate,
        status: 'Active',
        incrementPercentage: revision.deltaPercentage,
        // Pass through full CTC for fields not in revision snapshot
        history: currentCTC.history,
        _isRevisionSnapshot: true,
        _revisionId: revision._id
    };
};

/**
 * Builds a CTC-shaped object from a history entry.
 */
const buildCTCSnapshot = (historyEntry, currentCTC) => {
    return {
        _id: currentCTC._id,
        employeeId: currentCTC.employeeId,
        adminId: currentCTC.adminId,
        annualCTC: historyEntry.annualCTC,
        monthlyGross: historyEntry.monthlyGross,
        netSalary: historyEntry.netSalary,
        earnings: historyEntry.earnings || [],
        deductions: historyEntry.deductions || [],
        effectiveDate: historyEntry.effectiveDate,
        status: 'Active',
        incrementPercentage: historyEntry.incrementPercentage || 0,
        history: currentCTC.history,
        _isHistorySnapshot: true
    };
};

/**
 * Computes backdated arrears for a salary revision.
 *
 * When effectiveDate is in the past, the employee should have received the
 * new salary from that month onwards. This function calculates:
 *  - Which months are affected (effectiveDate month → previous full calendar month)
 *  - Whether a salary slip already existed for each month
 *  - The monthly delta and total arrears amount
 *
 * @param {number} prevMonthlyNet   - Net salary BEFORE revision
 * @param {number} newMonthlyNet    - Net salary AFTER revision
 * @param {Date}   effectiveDate    - When the new salary takes effect (can be past)
 * @param {ObjectId} employeeId     - For slip lookup
 * @param {ObjectId} adminId        - For slip lookup
 * @returns {{ isBackdated, arrearsMonths, arrearsAmount, arrearsStatus }}
 */
export const computeBackdatedArrears = async (prevMonthlyNet, newMonthlyNet, effectiveDate, employeeId, adminId) => {
    const effDate = new Date(effectiveDate);
    const now = new Date();

    // Current month boundary (first day of current month)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Effective month boundary (first day of effective month)
    const effMonthStart = new Date(effDate.getFullYear(), effDate.getMonth(), 1);

    // Is backdated? Only if effective month is strictly before current month
    const isBackdated = effMonthStart < currentMonthStart;

    if (!isBackdated) {
        return { isBackdated: false, arrearsMonths: [], arrearsAmount: 0, arrearsStatus: 'None' };
    }

    const monthlyDelta = Math.round(newMonthlyNet - prevMonthlyNet);
    const arrearsMonths = [];

    // Iterate from effective month up to (but NOT including) current month
    let cursor = new Date(effMonthStart);
    while (cursor < currentMonthStart) {
        const m = cursor.getMonth() + 1;  // 1-based
        const y = cursor.getFullYear();
        const monthStr = `${y}-${String(m).padStart(2, '0')}`;

        // Check if a salary slip already exists for this month
        const slip = await SalarySlip.findOne({
            employeeId,
            adminId,
            month: m,
            year: y
        }).select('_id');

        arrearsMonths.push({
            month: m,
            year: y,
            monthStr,
            monthlyDelta,
            slipExists: !!slip,
            slipId: slip ? slip._id : null
        });

        // Advance to next month
        cursor.setMonth(cursor.getMonth() + 1);
    }

    const arrearsAmount = Math.round(monthlyDelta * arrearsMonths.length);
    const arrearsStatus = arrearsAmount !== 0 ? 'Pending' : 'None';

    return { isBackdated, arrearsMonths, arrearsAmount, arrearsStatus };
};

/**
 * Returns a human-readable label for a month number.
 * @param {number} m - 1..12
 * @param {number} y - year
 */
export const monthLabel = (m, y) => {
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
