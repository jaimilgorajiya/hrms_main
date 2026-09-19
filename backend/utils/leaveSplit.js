import Request from '../models/Request.Model.js';

/**
 * Helper to get all overlapping days of a range [fromDateStr, toDateStr] in a given year-month YYYY-MM
 */
export const getOverlappingDaysInMonth = (fromDateStr, toDateStr, leaveDuration, yearMonthStr) => {
    const monthStart = new Date(yearMonthStr + "-01");
    const [year, month] = yearMonthStr.split('-').map(Number);
    const monthEnd = new Date(year, month, 0); // last day of month

    const reqStart = new Date(fromDateStr);
    const reqEnd = new Date(toDateStr);

    const overlapStart = new Date(Math.max(monthStart.getTime(), reqStart.getTime()));
    const overlapEnd = new Date(Math.min(monthEnd.getTime(), reqEnd.getTime()));

    if (overlapStart > overlapEnd) {
        return 0;
    }

    const diffMs = overlapEnd.getTime() - overlapStart.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    return leaveDuration === "Full Day" ? diffDays : 0.5;
};

/**
 * Format a Date object or YYYY-MM-DD string to YYYY-MM-DD
 */
export const formatDateStr = (dateObj) => {
    const d = new Date(dateObj);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Calculate leave split (Paid vs Unpaid) based on:
 * 1. Total Annual Paid Leave Entitlement (noOfPaidLeaves)
 * 2. Monthly Paid Leave Limit (maxPLMonth / maxUseInMonth)
 *
 * @param {Object} params
 * @param {Object} params.employee - User document (with leaveGroup populated)
 * @param {String} params.fromDate - 'YYYY-MM-DD'
 * @param {String} params.toDate - 'YYYY-MM-DD'
 * @param {String} [params.leaveDuration='Full Day'] - 'Full Day' | 'First Half' | 'Second Half'
 * @param {String} [params.leaveCategory='Paid'] - 'Paid' | 'Unpaid'
 * @returns {Promise<Object>}
 */
export const calculateLeaveSplit = async ({
    employee,
    fromDate,
    toDate,
    leaveDuration = 'Full Day',
    leaveCategory = 'Paid'
}) => {
    const startStr = fromDate;
    const endStr = toDate || fromDate;
    const isHalfDay = leaveDuration === 'First Half' || leaveDuration === 'Second Half';

    const reqStart = new Date(startStr);
    const reqEnd = new Date(endStr);
    const totalDays = isHalfDay ? 0.5 : (Math.ceil(Math.abs(reqEnd - reqStart) / (1000 * 60 * 60 * 24)) + 1);

    // If already Unpaid, no split needed
    if (leaveCategory === 'Unpaid') {
        return {
            isSplit: false,
            requestedDays: totalDays,
            paidDays: 0,
            unpaidDays: totalDays,
            reasonForSplit: null,
            segments: [
                { fromDate: startStr, toDate: endStr, duration: leaveDuration, category: 'Unpaid', days: totalDays }
            ]
        };
    }

    // 1. Annual Paid Leave Entitlement & Used
    const entitlement = Number(employee.noOfPaidLeaves || employee.leaveGroup?.noOfPaidLeaves || 0);
    const allApprovedRequests = await Request.find({
        employee: employee._id,
        requestType: 'Leave',
        status: { $ne: 'Rejected' },
        leaveCategory: 'Paid'
    });

    let totalUsedAnnual = 0;
    allApprovedRequests.forEach(r => {
        const s = new Date(r.fromDate);
        const e = new Date(r.toDate);
        const diffDays = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
        totalUsedAnnual += (r.leaveDuration === 'Full Day' ? diffDays : 0.5);
    });
    const remainingAnnual = Math.max(0, entitlement - totalUsedAnnual);

    // 2. Monthly Quota & Used
    const maxInMonth = (employee.maxPLMonth && employee.maxPLMonth > 0)
        ? employee.maxPLMonth
        : (employee.leaveGroup?.maxUseInMonth || 0);

    let remainingMonthly = 9999;
    if (maxInMonth > 0) {
        const ym = startStr.substring(0, 7);
        const [year, month] = ym.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const monthStart = `${ym}-01`;
        const monthEnd = `${ym}-${String(lastDay).padStart(2, '0')}`;

        const monthlyApproved = await Request.find({
            employee: employee._id,
            requestType: 'Leave',
            status: { $ne: 'Rejected' },
            leaveCategory: 'Paid',
            fromDate: { $lte: monthEnd },
            toDate: { $gte: monthStart }
        });

        let usedInMonth = 0;
        monthlyApproved.forEach(req => {
            usedInMonth += getOverlappingDaysInMonth(req.fromDate, req.toDate, req.leaveDuration, ym);
        });
        remainingMonthly = Math.max(0, maxInMonth - usedInMonth);
    }

    // Max allowed paid days for this request
    const maxPaidDays = Math.max(0, Math.min(totalDays, remainingAnnual, remainingMonthly));

    // Case A: Full requested days fit within Paid quota
    if (maxPaidDays >= totalDays) {
        return {
            isSplit: false,
            requestedDays: totalDays,
            paidDays: totalDays,
            unpaidDays: 0,
            remainingAnnual,
            remainingMonthly: maxInMonth > 0 ? remainingMonthly : null,
            reasonForSplit: null,
            segments: [
                { fromDate: startStr, toDate: endStr, duration: leaveDuration, category: 'Paid', days: totalDays }
            ]
        };
    }

    // Case B: Zero paid days available -> Entire request becomes Unpaid
    if (maxPaidDays === 0) {
        const reason = remainingAnnual === 0
            ? 'Annual Paid Leave balance exhausted'
            : `Monthly Paid Leave limit (${maxInMonth}/month) reached`;
        return {
            isSplit: true,
            requestedDays: totalDays,
            paidDays: 0,
            unpaidDays: totalDays,
            remainingAnnual,
            remainingMonthly: maxInMonth > 0 ? remainingMonthly : null,
            reasonForSplit: reason,
            segments: [
                { fromDate: startStr, toDate: endStr, duration: leaveDuration, category: 'Unpaid', days: totalDays }
            ]
        };
    }

    // Case C: Partial Paid Days available -> Auto-Split into Paid + Unpaid
    const paidCount = Math.floor(maxPaidDays);
    const unpaidCount = totalDays - paidCount;

    if (paidCount === 0) {
        return {
            isSplit: true,
            requestedDays: totalDays,
            paidDays: 0,
            unpaidDays: totalDays,
            remainingAnnual,
            remainingMonthly: maxInMonth > 0 ? remainingMonthly : null,
            reasonForSplit: 'Paid leave balance insufficient for a full day',
            segments: [
                { fromDate: startStr, toDate: endStr, duration: leaveDuration, category: 'Unpaid', days: totalDays }
            ]
        };
    }

    // Calculate dates for the 2 segments
    const sDate = new Date(startStr);
    const paidEndDateObj = new Date(sDate);
    paidEndDateObj.setDate(paidEndDateObj.getDate() + (paidCount - 1));
    const paidEndStr = formatDateStr(paidEndDateObj);

    const unpaidStartDateObj = new Date(sDate);
    unpaidStartDateObj.setDate(unpaidStartDateObj.getDate() + paidCount);
    const unpaidStartStr = formatDateStr(unpaidStartDateObj);

    const reason = maxPaidDays === remainingMonthly
        ? `Monthly Paid Leave quota (${maxInMonth} days/month) reached`
        : `Only ${remainingAnnual} annual Paid Leave days remaining`;

    return {
        isSplit: true,
        requestedDays: totalDays,
        paidDays: paidCount,
        unpaidDays: unpaidCount,
        remainingAnnual,
        remainingMonthly: maxInMonth > 0 ? remainingMonthly : null,
        reasonForSplit: reason,
        segments: [
            { fromDate: startStr, toDate: paidEndStr, duration: leaveDuration, category: 'Paid', days: paidCount },
            { fromDate: unpaidStartStr, toDate: endStr, duration: leaveDuration, category: 'Unpaid', days: unpaidCount }
        ]
    };
};
