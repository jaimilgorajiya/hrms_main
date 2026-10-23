import SalaryRevision from '../models/SalaryRevision.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import User from '../models/User.Model.js';
import { computeBackdatedArrears, getCTCForMonth } from '../utils/salaryRevisionHelper.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Apply a percentage or fixed multiplier to each earnings / deductions array
 * and return scaled components plus updated totals.
 */
const scaleComponents = (components, factor, fixedDelta, mode, totalBase) => {
    return components.map(comp => {
        let newAmount;
        if (mode === 'percentage') {
            newAmount = Math.round(comp.amount * factor);
        } else {
            const weight = totalBase > 0 ? comp.amount / totalBase : 0;
            newAmount = Math.round(comp.amount + fixedDelta * weight);
        }
        return { ...comp.toObject ? comp.toObject() : comp, amount: Math.max(0, newAmount) };
    });
};

// ─── Create Salary Revision ───────────────────────────────────────────────────

/**
 * POST /api/salary-revision
 * Body: { employeeId, adjustmentMode, adjustmentValue, effectiveDate, remark }
 *
 * Supports backdated effective dates. When the effectiveDate is in a past month,
 * the system automatically computes arrears (difference × number of past months).
 */
export const createSalaryRevision = async (req, res) => {
    try {
        const adminId = req.user._id;
        const {
            employeeId,
            adjustmentMode,
            adjustmentValue,
            effectiveDate,
            remark
        } = req.body;

        // ── Validation ──────────────────────────────────────────
        if (!employeeId || !adjustmentMode || adjustmentValue === undefined || !effectiveDate) {
            return res.status(400).json({
                success: false,
                message: 'employeeId, adjustmentMode, adjustmentValue, and effectiveDate are required.'
            });
        }
        if (!['percentage', 'fixed'].includes(adjustmentMode)) {
            return res.status(400).json({ success: false, message: 'adjustmentMode must be percentage or fixed.' });
        }
        const adjVal = parseFloat(adjustmentValue);
        if (isNaN(adjVal) || adjVal === 0) {
            return res.status(400).json({ success: false, message: 'adjustmentValue must be a non-zero number.' });
        }

        // ── Fetch employee ───────────────────────────────────────
        const employee = await User.findOne({ _id: employeeId, adminId });
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        // ── Fetch current CTC ────────────────────────────────────
        const currentCTC = await EmployeeCTC.findOne({ employeeId, adminId });
        if (!currentCTC) {
            return res.status(404).json({
                success: false,
                message: 'No CTC record found for this employee. Please assign a CTC first.'
            });
        }

        // ── Compute new salary values ────────────────────────────
        const prevAnnualCTC = currentCTC.annualCTC;
        const prevMonthlyGross = currentCTC.monthlyGross;
        const prevNetSalary = currentCTC.netSalary;

        let newAnnualCTC, newMonthlyGross, newNetSalary;
        let factor = 1;
        let fixedDeltaMonthly = 0;

        if (adjustmentMode === 'percentage') {
            factor = 1 + (adjVal / 100);
            newAnnualCTC = Math.round(prevAnnualCTC * factor);
            newMonthlyGross = Math.round(prevMonthlyGross * factor);
            newNetSalary = Math.round(prevNetSalary * factor);
        } else {
            newAnnualCTC = Math.round(prevAnnualCTC + adjVal);
            newMonthlyGross = Math.round(prevMonthlyGross + (adjVal / 12));
            newNetSalary = Math.round(prevNetSalary + (adjVal / 12));
            fixedDeltaMonthly = adjVal / 12;
        }

        if (newAnnualCTC < 0 || newMonthlyGross < 0 || newNetSalary < 0) {
            return res.status(400).json({ success: false, message: 'Salary cannot be reduced below zero.' });
        }

        const revisionType = adjVal >= 0 ? 'Increment' : 'Decrement';

        const totalEarnings = currentCTC.earnings.reduce((s, e) => s + e.amount, 0);
        const totalDeductions = currentCTC.deductions.reduce((s, d) => s + d.amount, 0);

        const newEarnings = scaleComponents(
            currentCTC.earnings, factor, fixedDeltaMonthly, adjustmentMode, totalEarnings
        );
        const newDeductions = scaleComponents(
            currentCTC.deductions, factor, fixedDeltaMonthly * (totalDeductions / (totalEarnings || 1)),
            adjustmentMode, totalDeductions
        );

        const deltaAmount = newAnnualCTC - prevAnnualCTC;
        const deltaPercentage = prevAnnualCTC > 0
            ? parseFloat(((deltaAmount / prevAnnualCTC) * 100).toFixed(2))
            : 0;

        // ── Backdated Arrears Computation ─────────────────────────
        const arrearsResult = await computeBackdatedArrears(
            prevNetSalary,
            newNetSalary,
            new Date(effectiveDate),
            employeeId,
            adminId
        );

        // ── Build history entry for EmployeeCTC ──────────────────
        const effectiveDateStr = new Date(effectiveDate).toISOString().split('T')[0];
        const historyItem = {
            annualCTC: prevAnnualCTC,
            monthlyGross: prevMonthlyGross,
            netSalary: prevNetSalary,
            earnings: currentCTC.earnings.map(e => ({
                componentId: e.componentId,
                componentName: e.componentName,
                amount: e.amount
            })),
            deductions: currentCTC.deductions.map(d => ({
                componentId: d.componentId,
                componentName: d.componentName,
                amount: d.amount
            })),
            effectiveDate: currentCTC.effectiveDate,
            endDate: new Date(new Date(effectiveDateStr).getTime() - 24 * 60 * 60 * 1000),
            incrementPercentage: deltaPercentage,
            status: 'Previous',
            branch: employee.branch || '',
            department: employee.department || '',
            designation: employee.designation || '',
            updatedAt: new Date()
        };

        // ── Update EmployeeCTC record ────────────────────────────
        const updatedCTC = await EmployeeCTC.findOneAndUpdate(
            { employeeId, adminId },
            {
                $set: {
                    annualCTC: newAnnualCTC,
                    monthlyGross: newMonthlyGross,
                    netSalary: newNetSalary,
                    earnings: newEarnings,
                    deductions: newDeductions,
                    effectiveDate: new Date(effectiveDate),
                    incrementPercentage: deltaPercentage,
                    status: 'Active'
                },
                $push: { history: historyItem }
            },
            { new: true, runValidators: true }
        );

        // ── Also update User.salaryDetails for consistency ───────
        await User.findByIdAndUpdate(employeeId, {
            'salaryDetails.ctc': newAnnualCTC,
            'salaryDetails.baseSalary': newMonthlyGross,
            'salaryDetails.effectiveFrom': new Date(effectiveDate)
        });

        // ── Create SalaryRevision audit record ───────────────────
        const revision = await SalaryRevision.create({
            adminId,
            employeeId,
            revisionType,
            adjustmentMode,
            adjustmentValue: adjVal,
            effectiveDate: new Date(effectiveDate),
            remark: remark || '',
            // Backdated fields
            isBackdated: arrearsResult.isBackdated,
            arrearsMonths: arrearsResult.arrearsMonths,
            arrearsAmount: arrearsResult.arrearsAmount,
            arrearsStatus: arrearsResult.arrearsStatus,
            // Snapshots
            previousAnnualCTC: prevAnnualCTC,
            previousMonthlyGross: prevMonthlyGross,
            previousNetSalary: prevNetSalary,
            previousEarnings: currentCTC.earnings.map(e => e.toObject ? e.toObject() : e),
            previousDeductions: currentCTC.deductions.map(d => d.toObject ? d.toObject() : d),
            newAnnualCTC,
            newMonthlyGross,
            newNetSalary,
            newEarnings,
            newDeductions,
            deltaAmount,
            deltaPercentage,
            status: 'Applied'
        });

        const populated = await SalaryRevision.findById(revision._id)
            .populate('employeeId', 'name employeeId designation department branch profilePhoto');

        return res.status(201).json({
            success: true,
            message: `Salary ${revisionType.toLowerCase()} applied successfully.`,
            revision: populated,
            updatedCTC,
            // Surface arrears info prominently so the frontend can alert admin
            arrearsInfo: {
                isBackdated: arrearsResult.isBackdated,
                arrearsAmount: arrearsResult.arrearsAmount,
                arrearsMonths: arrearsResult.arrearsMonths,
                arrearsStatus: arrearsResult.arrearsStatus
            }
        });

    } catch (error) {
        console.error('createSalaryRevision error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

// ─── List All Revisions (admin view) ─────────────────────────────────────────

export const getAllSalaryRevisions = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { type, employeeId, from, to, page = 1, limit = 50 } = req.query;

        const filter = { adminId };
        if (type && ['Increment', 'Decrement'].includes(type)) filter.revisionType = type;
        if (employeeId) filter.employeeId = employeeId;
        if (from || to) {
            filter.effectiveDate = {};
            if (from) filter.effectiveDate.$gte = new Date(from);
            if (to) filter.effectiveDate.$lte = new Date(to);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [revisions, total] = await Promise.all([
            SalaryRevision.find(filter)
                .populate('employeeId', 'name employeeId designation department branch profilePhoto')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            SalaryRevision.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            revisions,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('getAllSalaryRevisions error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Get Revisions for One Employee ──────────────────────────────────────────

export const getEmployeeSalaryRevisions = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeId } = req.params;

        const revisions = await SalaryRevision.find({ adminId, employeeId })
            .populate('employeeId', 'name employeeId designation department branch profilePhoto')
            .sort({ effectiveDate: -1 });

        return res.status(200).json({ success: true, revisions });
    } catch (error) {
        console.error('getEmployeeSalaryRevisions error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Get Single Revision ──────────────────────────────────────────────────────

export const getSalaryRevisionById = async (req, res) => {
    try {
        const adminId = req.user._id;
        const revision = await SalaryRevision.findOne({ _id: req.params.id, adminId })
            .populate('employeeId', 'name employeeId designation department branch profilePhoto email');

        if (!revision) {
            return res.status(404).json({ success: false, message: 'Revision not found.' });
        }

        return res.status(200).json({ success: true, revision });
    } catch (error) {
        console.error('getSalaryRevisionById error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Revert Revision ─────────────────────────────────────────────────────────

export const revertSalaryRevision = async (req, res) => {
    try {
        const adminId = req.user._id;
        const revision = await SalaryRevision.findOne({ _id: req.params.id, adminId });

        if (!revision) {
            return res.status(404).json({ success: false, message: 'Revision not found.' });
        }
        if (revision.status === 'Reverted') {
            return res.status(400).json({ success: false, message: 'This revision has already been reverted.' });
        }

        await EmployeeCTC.findOneAndUpdate(
            { employeeId: revision.employeeId, adminId },
            {
                $set: {
                    annualCTC: revision.previousAnnualCTC,
                    monthlyGross: revision.previousMonthlyGross,
                    netSalary: revision.previousNetSalary,
                    earnings: revision.previousEarnings,
                    deductions: revision.previousDeductions,
                    effectiveDate: revision.effectiveDate,
                    incrementPercentage: 0,
                    status: 'Active'
                }
            },
            { new: true }
        );

        await User.findByIdAndUpdate(revision.employeeId, {
            'salaryDetails.ctc': revision.previousAnnualCTC,
            'salaryDetails.baseSalary': revision.previousMonthlyGross
        });

        revision.status = 'Reverted';
        await revision.save();

        return res.status(200).json({
            success: true,
            message: 'Salary revision reverted successfully.',
            revision
        });
    } catch (error) {
        console.error('revertSalaryRevision error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Mark Arrears as Settled ──────────────────────────────────────────────────

/**
 * PATCH /api/salary-revision/:id/settle-arrears
 * Body: { remark }
 * Marks the backdated revision's arrears as settled (after admin manually pays them).
 */
export const settleArrears = async (req, res) => {
    try {
        const adminId = req.user._id;
        const revision = await SalaryRevision.findOne({ _id: req.params.id, adminId });

        if (!revision) {
            return res.status(404).json({ success: false, message: 'Revision not found.' });
        }
        if (!revision.isBackdated) {
            return res.status(400).json({ success: false, message: 'This revision is not backdated — no arrears to settle.' });
        }
        if (revision.arrearsStatus === 'Settled') {
            return res.status(400).json({ success: false, message: 'Arrears already marked as settled.' });
        }

        revision.arrearsStatus = 'Settled';
        revision.arrearsSettledAt = new Date();
        revision.arrearsSettledRemark = req.body.remark || '';
        await revision.save();

        return res.status(200).json({
            success: true,
            message: 'Arrears marked as settled.',
            revision
        });
    } catch (error) {
        console.error('settleArrears error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Preview Arrears (before applying revision) ───────────────────────────────

/**
 * POST /api/salary-revision/preview-arrears
 * Body: { employeeId, adjustmentMode, adjustmentValue, effectiveDate }
 * Returns arrears preview without saving anything.
 */
export const previewArrears = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeId, adjustmentMode, adjustmentValue, effectiveDate } = req.body;

        if (!employeeId || !adjustmentMode || adjustmentValue === undefined || !effectiveDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const currentCTC = await EmployeeCTC.findOne({ employeeId, adminId });
        if (!currentCTC) {
            return res.status(404).json({ success: false, message: 'No CTC found for this employee.' });
        }

        const adjVal = parseFloat(adjustmentValue);
        const prevNet = currentCTC.netSalary;
        let newNet;

        if (adjustmentMode === 'percentage') {
            newNet = Math.round(prevNet * (1 + adjVal / 100));
        } else {
            newNet = Math.round(prevNet + adjVal / 12);
        }

        const arrearsResult = await computeBackdatedArrears(
            prevNet, newNet, new Date(effectiveDate), employeeId, adminId
        );

        return res.status(200).json({
            success: true,
            preview: {
                ...arrearsResult,
                previousNetMonthly: prevNet,
                newNetMonthly: newNet,
                monthlyDelta: newNet - prevNet
            }
        });
    } catch (error) {
        console.error('previewArrears error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Get CTC for a Specific Month ────────────────────────────────────────────

/**
 * GET /api/salary-revision/ctc-for-month?employeeId=&month=&year=
 * Returns the CTC that was active for a given month/year.
 * Used by the salary slip generation pages to load the correct salary.
 */
export const getCTCForMonthAPI = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeId, month, year } = req.query;

        if (!employeeId || !month || !year) {
            return res.status(400).json({ success: false, message: 'employeeId, month and year are required.' });
        }

        const ctc = await getCTCForMonth(employeeId, parseInt(month), parseInt(year));
        if (!ctc) {
            return res.status(404).json({ success: false, message: 'No CTC found for this employee.' });
        }

        return res.status(200).json({ success: true, ctc });
    } catch (error) {
        console.error('getCTCForMonthAPI error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ─── Summary Stats ────────────────────────────────────────────────────────────

export const getSalaryRevisionStats = async (req, res) => {
    try {
        const adminId = req.user._id;

        const [totalIncrements, totalDecrements, pendingArrears, recentRevisions, avgDelta] = await Promise.all([
            SalaryRevision.countDocuments({ adminId, revisionType: 'Increment', status: 'Applied' }),
            SalaryRevision.countDocuments({ adminId, revisionType: 'Decrement', status: 'Applied' }),
            SalaryRevision.countDocuments({ adminId, isBackdated: true, arrearsStatus: 'Pending', status: 'Applied' }),
            SalaryRevision.find({ adminId, status: 'Applied' })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('employeeId', 'name employeeId profilePhoto designation'),
            SalaryRevision.aggregate([
                { $match: { adminId, status: 'Applied' } },
                { $group: { _id: null, avgDelta: { $avg: '$deltaPercentage' } } }
            ])
        ]);

        // Total pending arrears amount
        const arrearsAgg = await SalaryRevision.aggregate([
            { $match: { adminId, isBackdated: true, arrearsStatus: 'Pending', status: 'Applied' } },
            { $group: { _id: null, totalArrears: { $sum: '$arrearsAmount' } } }
        ]);
        const totalPendingArrearsAmount = arrearsAgg[0]?.totalArrears || 0;

        return res.status(200).json({
            success: true,
            stats: {
                totalIncrements,
                totalDecrements,
                pendingArrears,
                totalPendingArrearsAmount,
                avgDeltaPercentage: avgDelta[0]?.avgDelta?.toFixed(2) || 0,
                recentRevisions
            }
        });
    } catch (error) {
        console.error('getSalaryRevisionStats error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
