import User from "../models/User.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";
import EmployeeCTC from "../models/EmployeeCTC.Model.js";
import { computeWorkingMinutes } from "../utils/attendance.js";
import { calculatePenaltyAmount } from "./PenaltyRule.Controller.js";
import PenaltyRule from "../models/PenaltyRule.Model.js";

export const getMonthlyPayoutSummary = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ success: false, message: "Month is required (YYYY-MM)" });

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        // 1. Fetch all active employees
        const employees = await User.find({ role: 'Employee', status: 'Active' })
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup')
            .select('name employeeId department designation workSetup');

        const summary = [];

        for (const emp of employees) {
            // 2. Fetch CTC
            const ctc = await EmployeeCTC.findOne({ employeeId: emp._id, status: 'Active' });
            if (!ctc) continue;

            // 3. Fetch Attendance for the month
            const monthAttendance = await Attendance.find({
                employee: emp._id,
                date: { $gte: startDate, $lte: endDate }
            });

            // 4. Fetch Approved Leaves
            const approvedLeaves = await Request.find({
                employee: emp._id,
                requestType: 'Leave',
                status: 'Approved',
                date: { $gte: startDate, $lte: endDate }
            });

            const usedPaidLeaves = approvedLeaves.filter(l => l.leaveCategory === 'Paid').length;
            const usedUnpaidLeaves = approvedLeaves.filter(l => l.leaveCategory === 'Unpaid').length;

            // 5. Calculate Stats
            const presentDays = monthAttendance.filter(a => a.status === 'Present').length;
            const halfDays = monthAttendance.filter(a => a.status === 'Half Day').length;
            const weekOffs = monthAttendance.filter(a => a.status === 'Week Off').length;
            const holidays = monthAttendance.filter(a => a.status === 'Holiday').length;
            const absentDaysCount = monthAttendance.filter(a => a.status === 'Absent').length;
            
            // Worked Minutes
            const workedMins = monthAttendance.reduce((acc, a) => acc + computeWorkingMinutes(a.punches, a.breaks), 0);
            
            // Expected Minutes (Simplified estimate based on shift)
            const shift = emp.workSetup?.shift;
            let expectedMins = 0;
            if (shift) {
                const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, monthNum - 1, d);
                    const dayName = daysOfWeek[dateObj.getDay()];
                    const isWeekOff = shift.weekOffDays?.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                    if (!isWeekOff) {
                        const sched = shift.schedule?.[dayName];
                        if (sched?.shiftStart && sched?.shiftEnd) {
                            const start = parseInt(sched.shiftStart.split(':')[0]) * 60 + parseInt(sched.shiftStart.split(':')[1]);
                            const end = parseInt(sched.shiftEnd.split(':')[0]) * 60 + parseInt(sched.shiftEnd.split(':')[1]);
                            expectedMins += (end > start ? end - start : (end + 1440 - start));
                        } else {
                            expectedMins += 540; // Default 9h
                        }
                    }
                }
            }

            // Penalties
            let totalLatePenalty = 0;
            let totalEarlyPenalty = 0;
            
            // Fetch Penalty Rule once per employee shift
            const rule = shift ? await PenaltyRule.findOne({ shift: shift._id }) : null;

            for (const a of monthAttendance) {
                totalLatePenalty += a.lateInPenalty?.amount || 0;
                totalEarlyPenalty += a.earlyOutPenalty?.amount || 0;
            }

            const monthPenalty = totalLatePenalty + totalEarlyPenalty;

            // 6. Final Salary Calculation (matching EmployeeDashboard logic)
            const salaryGroup = emp.workSetup?.salaryGroup;
            const isFixed = salaryGroup?.workingDaysType === 'Fixed Working Days';
            const baseDays = isFixed ? (salaryGroup?.fixedDays || 26) : daysInMonth;

            const perDayGross = (ctc.monthlyGross || 0) / baseDays;
            const perDayNet = (ctc.netSalary || 0) / baseDays;

            // 6. Calculate Payable Days (The core for both logic types)
            const payableDays = presentDays + (halfDays * 0.5) + weekOffs + holidays + usedPaidLeaves;
            const actualDaysInMonth = daysInMonth; 

            let accruedGross = 0;
            let accruedNet = 0;
            let unpaidLeaveDeduction = 0;

            if (isFixed) {
                // FIXED LOGIC (e.g., Fixed 28)
                const cappedPayable = Math.min(baseDays, payableDays);
                const lopDays = baseDays - cappedPayable;
                
                accruedGross = perDayGross * cappedPayable;
                accruedNet = (perDayNet * cappedPayable) - monthPenalty;
                // Total Deduction is everything lost from the base
                unpaidLeaveDeduction = (ctc.netSalary || 0) - accruedNet - monthPenalty;
            } else {
                // CALENDAR DAYS LOGIC
                accruedGross = perDayGross * payableDays;
                accruedNet = (perDayNet * payableDays) - monthPenalty;
                // Total Deduction is everything lost from the full month
                unpaidLeaveDeduction = (ctc.netSalary || 0) - accruedNet - monthPenalty;
            }

            // Rounding
            if (salaryGroup?.roundedSalary === 'Yes') {
                accruedGross = Math.round(accruedGross);
                accruedNet = Math.round(accruedNet);
                unpaidLeaveDeduction = Math.round(unpaidLeaveDeduction);
            } else {
                accruedGross = parseFloat(accruedGross.toFixed(2));
                accruedNet = parseFloat(accruedNet.toFixed(2));
                unpaidLeaveDeduction = parseFloat(unpaidLeaveDeduction.toFixed(2));
            }

            summary.push({
                employee: {
                    _id: emp._id,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department,
                    designation: emp.designation
                },
                attendance: {
                    present: presentDays,
                    halfDay: halfDays,
                    absent: absentDaysCount,
                    weekOff: weekOffs,
                    holiday: holidays,
                    paidLeave: usedPaidLeaves,
                    unpaidLeave: usedUnpaidLeaves
                },
                hours: {
                    worked: Math.floor(workedMins / 60) + 'h ' + (workedMins % 60) + 'm',
                    expected: Math.floor(expectedMins / 60) + 'h ' + (expectedMins % 60) + 'm'
                },
                penalties: {
                    lateIn: totalLatePenalty,
                    earlyOut: totalEarlyPenalty,
                    total: monthPenalty
                },
                salary: {
                    monthlyGross: ctc.monthlyGross,
                    monthlyNet: ctc.netSalary,
                    accruedGross,
                    accruedNet,
                    unpaidLeaveDeduction
                }
            });
        }

        res.status(200).json({ success: true, month, summary });
    } catch (error) {
        console.error("getMonthlyPayoutSummary error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
