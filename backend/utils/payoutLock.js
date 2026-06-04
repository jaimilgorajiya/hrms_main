import Payout from '../models/Payout.Model.js';

/**
 * Checks if a specific date or date range falls inside a locked month.
 * A month is considered locked for an employee if a payout record with 'Published' status exists.
 * 
 * @param {String} employeeId - ID of the employee
 * @param {String|Date} startDate - YYYY-MM-DD or Date object
 * @param {String|Date} [endDate] - Optional YYYY-MM-DD or Date object for ranges
 * @returns {Promise<Boolean>} True if locked, false otherwise
 */
export const isMonthLocked = async (employeeId, startDate, endDate = null) => {
    try {
        const start = typeof startDate === 'string' ? startDate : new Date(startDate).toISOString().split('T')[0];
        const end = endDate ? (typeof endDate === 'string' ? endDate : new Date(endDate).toISOString().split('T')[0]) : start;

        const startMonth = start.substring(0, 7); // YYYY-MM
        const endMonth = end.substring(0, 7); // YYYY-MM

        // Find any published payout for the employee in the month range
        const lockedPayout = await Payout.findOne({
            employeeId,
            status: 'Published',
            $or: [
                { month: startMonth },
                { month: endMonth }
            ]
        });

        return !!lockedPayout;
    } catch (error) {
        console.error("Error in isMonthLocked check:", error);
        return false; // Fail open defensively, but log error
    }
};
