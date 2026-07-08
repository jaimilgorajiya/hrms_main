import SalarySlip from '../models/SalarySlip.Model.js';
import User from '../models/User.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import Payout from '../models/Payout.Model.js';

// ──────────────────────────────────────────────────────────────
// CREATE / UPDATE  (upsert: one slip per employee per month/year)
// ──────────────────────────────────────────────────────────────
const createSalarySlip = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeId, month, year } = req.body;

        if (!employeeId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'employeeId, month and year are required'
            });
        }

        const user = await User.findOne({ _id: employeeId, adminId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Backend security validation: verify ctc calculations
        const ctc = await EmployeeCTC.findOne({ employeeId, status: 'Active' });
        if (!ctc) {
            return res.status(400).json({
                success: false,
                message: 'Employee does not have an active CTC structure.'
            });
        }

        const grossMonthly = ctc.monthlyGross || 0;
        const netMonthly = ctc.netSalary || 0;

        const mwd = Math.max(Number(req.body.monthWorkingDays) || 1, 1);
        const ewd = Number(req.body.employeeWorkingDays) || 0;
        const pl = Number(req.body.paidLeave) || 0;
        const ul = Number(req.body.unpaidLeave) || 0;
        const ph = Number(req.body.paidHolidays) || 0;
        const pwo = Number(req.body.paidWeekOff) || 0;
        const edp = Number(req.body.extraDaysPaid) || 0;
        const oe = Number(req.body.otherEarnings) || 0;
        const od = Number(req.body.otherDeduction) || 0;

        const totalLeaves = pl + ul;
        const totalDivisor = Math.max(mwd + pwo + ph, 1);
        const perDaySalary = Math.round((grossMonthly / totalDivisor) * 100) / 100;
        const perDaySalaryExt = perDaySalary;
        const paidDays = ewd + pl + ph + pwo + edp;
        const thisMonthGross = Math.round((perDaySalary * paidDays) * 100) / 100;
        const extraEarning = 0;

        const earnings = (ctc.earnings || []).map(e => ({
            componentName: e.componentName,
            monthlyAmount: Number(e.amount) || 0,
            calculatedAmount: grossMonthly > 0
                ? Math.round(((e.amount || 0) / grossMonthly) * thisMonthGross * 100) / 100
                : 0
        }));

        const deductions = (ctc.deductions || []).map(d => ({
            componentName: d.componentName,
            amount: Number(d.amount) || 0
        }));

        const totalEarnings = Math.round((earnings.reduce((s, e) => s + e.calculatedAmount, 0) + oe + extraEarning) * 100) / 100;
        const totalDeductions = Math.round((deductions.reduce((s, d) => s + d.amount, 0) + od) * 100) / 100;
        const netSalary = Math.round((totalEarnings - totalDeductions) * 100) / 100;

        // Security check: verify that frontend didn't manipulate the final netSalary beyond standard rounding margin
        const frontendNet = Number(req.body.netSalary) || 0;
        if (Math.abs(netSalary - frontendNet) > 2) {
            return res.status(400).json({
                success: false,
                message: 'Salary calculations mismatch. Attempted value manipulation blocked.'
            });
        }

        // Save backend verified numbers to prevent any client-side injection
        const validatedPayload = {
            ...req.body,
            adminId,
            totalLeaves,
            perDaySalary,
            perDaySalaryExtra: perDaySalaryExt,
            thisMonthGross,
            earnings,
            deductions,
            totalEarnings,
            totalDeductions,
            netSalary,
            joiningNetSalary: netMonthly,
            joiningMonthlyGross: grossMonthly
        };

        const slip = await SalarySlip.findOneAndUpdate(
            { employeeId, month: Number(month), year: Number(year), adminId },
            validatedPayload,
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        // Sync with Payout collection so it shows up in Generate Salary Slips page
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        await Payout.findOneAndUpdate(
            { employeeId, month: monthStr },
            {
                $set: {
                    baseSalary: grossMonthly,
                    attendance: {
                        present: ewd,
                        halfDay: 0,
                        absent: ul,
                        weekOff: pwo,
                        holiday: ph,
                        paidLeave: pl,
                        unpaidLeave: ul
                    },
                    extraDayBenefit: {
                        days: edp,
                        amount: edp * perDaySalary
                    },
                    joiningNetSalary: netMonthly,
                    joiningMonthlyGross: grossMonthly,
                    earnings: earnings.map(e => ({
                        componentName: e.componentName,
                        monthlyAmount: e.monthlyAmount,
                        calculatedAmount: e.calculatedAmount
                    })),
                    deductions: deductions.map(d => ({
                        componentName: d.componentName,
                        amount: d.amount
                    })),
                    systemAccrued: thisMonthGross,
                    penalties: {
                        total: od,
                        lateIn: 0,
                        earlyOut: 0
                    },
                    adjustments: {
                        bonus: { amount: oe, reason: 'Other Earnings' },
                        deduction: { amount: 0, reason: '' }
                    },
                    finalPayout: netSalary,
                    status: 'Initiated',
                    initiatedBy: adminId,
                    initiatedAt: new Date(),
                    description: req.body.description || ""
                }
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Salary slip saved successfully',
            slip
        });
    } catch (error) {
        console.error('Error in createSalarySlip:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A salary slip already exists for this employee for the selected month.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

// ──────────────────────────────────────────────────────────────
// GET ALL  (admin-scoped, filterable by month / year / branch / dept)
// ──────────────────────────────────────────────────────────────
const getSalarySlips = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { month, year, branch, department } = req.query;

        const filter = { adminId };
        if (month)      filter.month      = parseInt(month);
        if (year)       filter.year       = parseInt(year);
        if (branch)     filter.branch     = branch;
        if (department) filter.department = department;

        const slips = await SalarySlip.find(filter)
            .populate('employeeId', 'name employeeId designation department branch profilePhoto')
            .sort({ year: -1, month: -1, createdAt: -1 });

        return res.status(200).json({ success: true, slips });
    } catch (error) {
        console.error('Error in getSalarySlips:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ──────────────────────────────────────────────────────────────
// GET ONE
// ──────────────────────────────────────────────────────────────
const getSalarySlipById = async (req, res) => {
    try {
        const adminId = req.user._id;
        const slip = await SalarySlip.findOne({ _id: req.params.id, adminId })
            .populate('employeeId', 'name employeeId designation department branch dateJoined profilePhoto');

        if (!slip) {
            return res.status(404).json({ success: false, message: 'Salary slip not found' });
        }

        return res.status(200).json({ success: true, slip });
    } catch (error) {
        console.error('Error in getSalarySlipById:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ──────────────────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────────────────
const deleteSalarySlip = async (req, res) => {
    try {
        const adminId = req.user._id;
        const slip = await SalarySlip.findOneAndDelete({ _id: req.params.id, adminId });
        if (!slip) {
            return res.status(404).json({ success: false, message: 'Salary slip not found' });
        }
        return res.status(200).json({ success: true, message: 'Salary slip deleted successfully' });
    } catch (error) {
        console.error('Error in deleteSalarySlip:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export { createSalarySlip, getSalarySlips, getSalarySlipById, deleteSalarySlip };
