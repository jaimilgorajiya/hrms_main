import User from "../models/User.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";
import EmployeeCTC from "../models/EmployeeCTC.Model.js";
import Holiday from "../models/Holiday.Model.js";
import { computeWorkingMinutes } from "../utils/attendance.js";
import PenaltyRule from "../models/PenaltyRule.Model.js";
import Payout from "../models/Payout.Model.js";
import Company from '../models/Company.Model.js';
import SalarySlip from '../models/SalarySlip.Model.js';
import pdfmake from 'pdfmake';

export const getMonthlyPayoutSummary = async (req, res) => {
    try {
        const { month, branch, department } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ success: false, message: "Month is required (YYYY-MM)" });

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;
        const adminId = req.user._id;

        const employeeQuery = {
            adminId,
            status: { $in: ['Active', 'Resigned'] }
        };
        if (branch) employeeQuery.branch = branch;
        if (department) employeeQuery.department = department;

        const employees = await User.find(employeeQuery)
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup')
            .select('name employeeId department designation branch workSetup role status');

        const employeeIds = employees.map(emp => emp._id);
        const existingPayouts = await Payout.find({ month, employeeId: { $in: employeeIds } });
        const initiatedMap = {};
        existingPayouts.forEach(p => {
            initiatedMap[p.employeeId.toString()] = p;
        });

        // Pre-fetch holidays for this month — build a date→isPaid lookup
        // used inside the payroll loop to determine if a Holiday day is paid
        const monthHolidays = await Holiday.find({
            adminId,
            year: year,
            date: { $gte: startDate, $lte: endDate },
            status: 'Active'
        });
        const holidayPaidMap = {};   // "YYYY-MM-DD" → true/false
        monthHolidays.forEach(h => {
            holidayPaidMap[h.date] = h.isPaid !== false; // default true if field missing
        });

        const summary = [];

        for (const emp of employees) {
            const isInitiated = !!initiatedMap[emp._id.toString()];

            const ctc = await EmployeeCTC.findOne({ employeeId: emp._id, status: 'Active' });
            const ctcMissing = !ctc;

            const monthAttendance = await Attendance.find({
                employee: emp._id,
                date: { $gte: startDate, $lte: endDate }
            });

            const approvedLeaves = await Request.find({
                employee: emp._id,
                requestType: 'Leave',
                status: 'Approved',
                date: { $gte: startDate, $lte: endDate }
            });

            const usedPaidLeaves = approvedLeaves
                .filter(l => l.leaveCategory === 'Paid')
                .reduce((sum, l) => sum + (l.leaveDuration === 'Full Day' ? 1 : 0.5), 0);
            const usedUnpaidLeaves = approvedLeaves
                .filter(l => l.leaveCategory === 'Unpaid')
                .reduce((sum, l) => sum + (l.leaveDuration === 'Full Day' ? 1 : 0.5), 0);

            // --- ADVANCED PAYROLL ENGINE ---
            const shift = emp.workSetup?.shift;
            let presentDaysCount = 0;
            let halfDaysCount = 0;
            let absentDaysCount = 0;
            let weekOffsPaid = 0;
            let holidaysPaid = 0;
            let extraDaysWorked = 0;

            const attendanceMap = {};
            monthAttendance.forEach(a => { attendanceMap[a.date] = a; });

            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            let workedMins = 0;
            let monthPenalty = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${month}-${String(d).padStart(2, '0')}`;
                const dateObj = new Date(year, monthNum - 1, d);
                const dayName = daysOfWeek[dateObj.getDay()];
                const isWeekOff = shift?.weekOffDays?.includes(dayName);

                const record = attendanceMap[dayStr];

                if (record) {
                    workedMins += computeWorkingMinutes(record.punches, record.breaks);

                    if (record.status === 'Present') {
                        presentDaysCount++;
                        if (isWeekOff) extraDaysWorked += 1;
                    } else if (record.status === 'Half Day') {
                        // Only count as a worked half-day if it was NOT a leave-based half-day.
                        // Leave-based half-days (leaveCategory set) are already counted in
                        // usedPaidLeaves / usedUnpaidLeaves below to avoid double-counting.
                        const isLeaveHalfDay = !!record.leaveCategory;
                        if (!isLeaveHalfDay) {
                            halfDaysCount++;
                            if (isWeekOff) extraDaysWorked += 0.5;
                        }
                    } else if (record.status === 'Absent') {
                        absentDaysCount++;
                    } else if (record.status === 'Holiday') {
                        // Only count as a paid holiday if the Holiday master record says isPaid
                        if (holidayPaidMap[dayStr] !== false) {
                            holidaysPaid++;
                        } else {
                            absentDaysCount++; // unpaid holiday — treated like absent for salary
                        }
                    } else if (record.status === 'Week Off') {
                        weekOffsPaid++;
                    }

                    // Accumulate penalties
                    monthPenalty += (record.lateInPenalty?.amount || 0) + (record.earlyOutPenalty?.amount || 0);
                } else {
                    // No record found: Treat as Paid Week Off or Unpaid Absent
                    if (isWeekOff) {
                        weekOffsPaid++;
                    }
                }
            }

            // Estimate expected mins (roughly 9h per working day)
            const expectedMins = Math.max(0, daysInMonth - weekOffsPaid - holidaysPaid) * 540;

            // Calculate Extra Benefit Multiplier (as Total Multiplier)
            // e.g., 2x means the employee gets 2 days of pay total for that day (1 regular + 1 bonus)
            const multiplierStr = shift?.extraPayoutMultiplier || 'Default';
            let totalMultiplier = 1; // Default is just regular pay
            if (multiplierStr === '1x') totalMultiplier = 1;
            else if (multiplierStr === '1.5x') totalMultiplier = 1.5;
            else if (multiplierStr === '2x' || multiplierStr === 'Default') totalMultiplier = 2; // Defaulting to 2x total pay for benefit

            // Total Payable Days calculation
            // Base = Worked + Paid Leaves + Paid Week Offs (recorded or missed) + Holidays
            const basePayable = presentDaysCount + (halfDaysCount * 0.5) + weekOffsPaid + holidaysPaid + usedPaidLeaves;

            // Extra Benefit = Days * (TotalMultiplier - 1)
            // Because they already have '1x' in the basePayable (as Present/HalfDay)
            const extraBenefit = extraDaysWorked * (totalMultiplier - 1);

            const payableDays = basePayable + extraBenefit;

            const salaryGroup = emp.workSetup?.salaryGroup;
            const isFixed = salaryGroup?.workingDaysType === 'Fixed Working Days';
            const baseDays = isFixed ? (salaryGroup?.fixedDays || 26) : daysInMonth;

            const perDayGross = ctc ? ((ctc.monthlyGross || 0) / baseDays) : 0;
            const perDayNet = ctc ? ((ctc.netSalary || 0) / baseDays) : 0;

            let accruedGross = 0;
            let accruedNet = 0;
            let unpaidLeaveDeduction = 0;

            if (isFixed) {
                // For fixed days (e.g. 26), capped at baseDays for regular work, but EXTRA days can exceed it.
                const regularPayable = Math.min(baseDays, basePayable);
                accruedGross = (perDayGross * regularPayable) + (perDayGross * extraBenefit);
                accruedNet = ((perDayNet * regularPayable) + (perDayNet * extraBenefit)) - monthPenalty;
                unpaidLeaveDeduction = (ctc?.netSalary || 0) - (perDayNet * regularPayable);
            } else {
                accruedGross = perDayGross * payableDays;
                accruedNet = (perDayNet * payableDays) - monthPenalty;
                unpaidLeaveDeduction = (ctc?.netSalary || 0) - (perDayNet * (payableDays - extraBenefit));
            }

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
                daysInMonth,
                isInitiated,
                attendance: {
                    present: presentDaysCount,
                    halfDay: halfDaysCount,
                    absent: absentDaysCount,
                    weekOff: weekOffsPaid,
                    holiday: holidaysPaid,
                    paidLeave: usedPaidLeaves,
                    unpaidLeave: usedUnpaidLeaves
                },
                hours: {
                    worked: Math.floor(workedMins / 60) + 'h ' + (workedMins % 60) + 'm',
                    expected: Math.floor(expectedMins / 60) + 'h ' + (expectedMins % 60) + 'm'
                },
                extraBenefits: {
                    extraDaysWorked,
                    multiplier: multiplierStr,
                    bonusPayDays: extraBenefit,
                    amount: extraBenefit * perDayNet
                },
                penalties: {
                    lateIn: isInitiated ? (initiatedMap[emp._id.toString()].penalties?.lateIn || 0) : monthPenalty,
                    total: isInitiated ? (initiatedMap[emp._id.toString()].penalties?.total || 0) : monthPenalty
                },
                salary: {
                    monthlyGross: ctc?.monthlyGross || 0,
                    monthlyNet: ctc?.netSalary || 0,
                    accruedGross: isInitiated ? (initiatedMap[emp._id.toString()].systemAccrued || 0) : accruedGross,
                    accruedNet: isInitiated ? (initiatedMap[emp._id.toString()].finalPayout || 0) : accruedNet,
                    unpaidLeaveDeduction: isInitiated ? 0 : unpaidLeaveDeduction,
                    extraDayAmount: extraBenefit * perDayNet
                },
                ctcMissing
            });
        }
        res.status(200).json({ success: true, month, summary });
    } catch (error) {
        console.error("getMonthlyPayoutSummary error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const initiatePayout = async (req, res) => {
    try {
        const {
            employeeId, month, attendance, baseSalary, systemAccrued, penalties, adjustments, extraDayBenefit, finalPayout
        } = req.body;
        const adminId = req.user._id;

        // Fetch CTC to snapshot it timezone-safely
        const ctc = await EmployeeCTC.findOne({ employeeId, status: 'Active' });
        let earningsSnapshot = [];
        let deductionsSnapshot = [];
        let joiningNetSalary = 0;
        let joiningMonthlyGross = 0;

        if (ctc) {
            joiningNetSalary = ctc.netSalary || 0;
            joiningMonthlyGross = ctc.monthlyGross || 0;

            const extraDayAmount = extraDayBenefit?.amount || 0;
            const adjustedAccrued = systemAccrued - extraDayAmount;
            const ratio = baseSalary > 0 ? (adjustedAccrued / baseSalary) : 0;

            earningsSnapshot = (ctc.earnings || []).map(e => ({
                componentName: e.componentName,
                monthlyAmount: Number(e.amount) || 0,
                calculatedAmount: Math.round((Number(e.amount) || 0) * ratio * 100) / 100
            }));

            deductionsSnapshot = (ctc.deductions || []).map(d => ({
                componentName: d.componentName,
                amount: Math.round((Number(d.amount) || 0) * ratio * 100) / 100
            }));
        }

        const payout = await Payout.findOneAndUpdate(
            { employeeId, month },
            {
                $set: {
                    attendance,
                    baseSalary,
                    systemAccrued,
                    penalties,
                    adjustments,
                    extraDayBenefit,
                    finalPayout,
                    joiningNetSalary,
                    joiningMonthlyGross,
                    earnings: earningsSnapshot,
                    deductions: deductionsSnapshot,
                    initiatedBy: adminId,
                    initiatedAt: new Date(),
                    status: 'Initiated'
                }
            },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: "Payout initiated successfully", payout });
    } catch (error) {
        console.error("initiatePayout error:", error);
        res.status(500).json({ success: false, message: "Failed to initiate payout" });
    }
};

export const generateSalarySlip = async (req, res) => {
    try {
        const { payoutIds } = req.body; // Array of IDs
        if (!payoutIds || !payoutIds.length) return res.status(400).json({ success: false, message: "No slips selected" });

        await Payout.updateMany(
            { _id: { $in: payoutIds }, status: 'Initiated' },
            { $set: { status: 'Generated' } }
        );

        res.status(200).json({ success: true, message: "Salary slips generated successfully" });
    } catch (error) {
        console.error("generateSalarySlip error:", error);
        res.status(500).json({ success: false, message: "Failed to generate slips" });
    }
};

export const publishSalarySlip = async (req, res) => {
    try {
        const { payoutIds } = req.body;
        if (!payoutIds || !payoutIds.length) return res.status(400).json({ success: false, message: "No slips selected" });

        await Payout.updateMany(
            { _id: { $in: payoutIds }, status: 'Generated' },
            { $set: { status: 'Published' } }
        );

        res.status(200).json({ success: true, message: "Salary slips published to employees" });
    } catch (error) {
        console.error("publishSalarySlip error:", error);
        res.status(500).json({ success: false, message: "Failed to publish slips" });
    }
};

export const getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const slips = await Payout.find({
            employeeId,
            status: 'Published'
        })
            .populate('employeeId', 'name employeeId department designation')
            .sort({ month: -1 });

        res.status(200).json({ success: true, history: slips });
    } catch (error) {
        console.error("getMyPayslips error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payslips" });
    }
};

export const downloadPayslip = async (req, res) => {
    try {
        const { id } = req.params;
        const payout = await Payout.findById(id).populate('employeeId', 'name employeeId department designation adminId');
        if (!payout) return res.status(404).json({ success: false, message: "Payslip not found" });

        // Security: employee can only download their own published slip
        // Admin can download any slip belonging to their org
        const isAdmin = req.user.role === 'Admin';
        const isOwner = payout.employeeId?._id?.toString() === req.user._id.toString();

        // Ensure that if it is an Admin, the employee belongs to this Admin's company (org validation)
        const isSameOrg = isAdmin && payout.employeeId?.adminId?.toString() === req.user._id.toString();

        if (!isSameOrg && !isOwner) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        // Fetch company details based on the admin who onboarded this employee
        const company = await Company.findOne({ adminId: payout.employeeId?.adminId });

        const [payoutYear, payoutMonthNum] = payout.month.split('-').map(Number);
        const salarySlipRecord = await SalarySlip.findOne({
            employeeId: payout.employeeId?._id,
            month: payoutMonthNum,
            year: payoutYear
        });
        const payoutDescription = payout.description || salarySlipRecord?.description || "";

        // --- Day-wise Salary Breakdown Calculation ---
        const employeeId = payout.employeeId?._id;
        const month = payout.month; // YYYY-MM
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const startDate = `${month}-01`;
        const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

        const user = await User.findById(employeeId)
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup');

        const shift = user?.workSetup?.shift;
        const salaryGroup = user?.workSetup?.salaryGroup;

        const monthAttendance = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate, $lte: endDate }
        });
        const attendanceMap = {};
        monthAttendance.forEach(a => { attendanceMap[a.date] = a; });

        const approvedLeaves = await Request.find({
            employee: employeeId,
            requestType: 'Leave',
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
        });
        const leavesMap = {};
        approvedLeaves.forEach(l => {
            leavesMap[l.date] = l;
        });

        const monthHolidays = await Holiday.find({
            adminId: user?.adminId || payout.initiatedBy,
            year: year,
            date: { $gte: startDate, $lte: endDate },
            status: 'Active'
        });
        const holidayPaidMap = {};
        monthHolidays.forEach(h => {
            holidayPaidMap[h.date] = {
                name: h.holidayName,
                isPaid: h.isPaid !== false
            };
        });

        const isFixed = salaryGroup?.workingDaysType === 'Fixed Working Days';
        const baseDays = isFixed ? (salaryGroup?.fixedDays || 26) : daysInMonth;
        const perDayNet = payout.joiningNetSalary ? (payout.joiningNetSalary / baseDays) : 0;
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const multiplierStr = shift?.extraPayoutMultiplier || 'Default';
        let totalMultiplier = 1;
        if (multiplierStr === '1x') totalMultiplier = 1;
        else if (multiplierStr === '1.5x') totalMultiplier = 1.5;
        else if (multiplierStr === '2x' || multiplierStr === 'Default') totalMultiplier = 2;

        const daywiseRows = [
            [
                { text: 'Date', style: 'tableHeader' },
                { text: 'Status', style: 'tableHeader' },
                { text: 'Punches', style: 'tableHeader' },
                { text: 'Work Hrs', style: 'tableHeader' },
                { text: 'Penalties', style: 'tableHeader' },
                { text: 'Earned Pay', style: 'tableHeader' }
            ]
        ];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${month}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, monthNum - 1, d);
            const dayName = daysOfWeek[dateObj.getDay()];
            const isWeekOff = shift?.weekOffDays?.includes(dayName);

            const attendanceRecord = attendanceMap[dayStr];
            const leaveRecord = leavesMap[dayStr];
            const holidayRecord = holidayPaidMap[dayStr];

            let status = 'Absent';
            let punchIn = '--';
            let punchOut = '--';
            let latePenalty = 0;
            let earlyPenalty = 0;
            let workedMins = 0;
            let earnedAmount = 0;

            if (attendanceRecord) {
                workedMins = computeWorkingMinutes(attendanceRecord.punches, attendanceRecord.breaks);
                const firstIn = attendanceRecord.punches.find(p => p.type === 'IN');
                const lastOut = [...attendanceRecord.punches].reverse().find(p => p.type === 'OUT');
                
                if (firstIn) {
                    punchIn = new Date(firstIn.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                    });
                }
                if (lastOut) {
                    punchOut = new Date(lastOut.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                    });
                }
                latePenalty = attendanceRecord.lateInPenalty?.amount || 0;
                earlyPenalty = attendanceRecord.earlyOutPenalty?.amount || 0;
                status = attendanceRecord.status;
            } else {
                if (isWeekOff) status = 'Week Off';
                else if (holidayRecord) status = 'Holiday';
            }

            if (leaveRecord) {
                status = leaveRecord.leaveCategory === 'Paid' ? 'Paid Leave' : 'Unpaid Leave';
                if (leaveRecord.leaveDuration === 'Half Day') {
                    status = leaveRecord.leaveCategory === 'Paid' ? 'Paid Leave (Half)' : 'Unpaid Leave (Half)';
                }
            }

            // Earned Amount
            if (status === 'Present') {
                if (isWeekOff || holidayRecord) earnedAmount = perDayNet * totalMultiplier;
                else earnedAmount = perDayNet;
            } else if (status === 'Half Day') {
                if (isWeekOff || holidayRecord) earnedAmount = perDayNet * 0.5 * totalMultiplier;
                else earnedAmount = perDayNet * 0.5;
            } else if (status === 'Paid Leave') {
                earnedAmount = perDayNet;
            } else if (status === 'Paid Leave (Half)') {
                earnedAmount = perDayNet * 0.5;
            } else if (status === 'Week Off') {
                earnedAmount = perDayNet;
            } else if (status === 'Holiday') {
                if (!holidayRecord || holidayRecord.isPaid) earnedAmount = perDayNet;
            }

            const totalPenalty = latePenalty + earlyPenalty;
            const netDailyEarned = Math.max(0, earnedAmount - totalPenalty);

            // Format date as DD-MMM
            const displayDate = `${String(d).padStart(2, '0')}-${dateObj.toLocaleString('en-US', { month: 'short' })}`;
            const punchesStr = punchIn !== '--' ? `${punchIn} - ${punchOut}` : '--';
            const workedHoursStr = workedMins > 0 ? `${Math.floor(workedMins / 60)}h ${workedMins % 60}m` : '--';
            const penaltyStr = totalPenalty > 0 ? `Rs. ${totalPenalty}` : '-';

            daywiseRows.push([
                { text: `${displayDate} (${dayName.slice(0, 3)})`, fontSize: 7, alignment: 'left' },
                { text: status, fontSize: 7, alignment: 'center' },
                { text: punchesStr, fontSize: 7, alignment: 'center' },
                { text: workedHoursStr, fontSize: 7, alignment: 'center' },
                { text: penaltyStr, fontSize: 7, alignment: 'center', color: totalPenalty > 0 ? '#ef4444' : '#475569' },
                { text: `Rs. ${Math.round(netDailyEarned).toLocaleString()}`, fontSize: 7, alignment: 'right', bold: true }
            ]);
        }

        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        // Initialize pdfmake instance
        pdfmake.setFonts(fonts);

        let earningRows = [];
        let deductionRows = [];

        // Process Dynamic Earnings from Snapshot
        if (payout.earnings && payout.earnings.length > 0) {
            earningRows = payout.earnings.map(e => ([
                { text: e.componentName, fontSize: 10 },
                { text: Math.round(e.calculatedAmount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]));
        } else {
            const adjustedAccrued = payout.systemAccrued - (payout.extraDayBenefit?.amount || 0);
            earningRows.push([
                { text: 'Basic Salary (Accrued)', fontSize: 10 },
                { text: Math.round(adjustedAccrued).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }

        // Process Dynamic Deductions from Snapshot
        if (payout.deductions && payout.deductions.length > 0) {
            deductionRows = payout.deductions.map(d => ([
                { text: d.componentName, fontSize: 10 },
                { text: Math.round(d.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]));
        }

        // Add System Penalties to Deductions
        if ((payout.penalties?.total || 0) > 0) {
            deductionRows.push([
                { text: 'Late In / Early Out', fontSize: 10 },
                { text: (payout.penalties.total).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }

        // Add Adjustments
        if ((payout.adjustments?.bonus?.amount || 0) > 0) {
            earningRows.push([
                { text: `Bonus: ${payout.adjustments.bonus.reason || 'Performance'}`, fontSize: 10 },
                { text: (payout.adjustments.bonus.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }
        if ((payout.adjustments?.deduction?.amount || 0) > 0) {
            deductionRows.push([
                { text: `Deduction: ${payout.adjustments.deduction.reason || 'Other'}`, fontSize: 10 },
                { text: (payout.adjustments.deduction.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }

        // Add Extra Day Benefit (New)
        if ((payout.extraDayBenefit?.amount || 0) > 0) {
            earningRows.push([
                { text: `Extra Day Benefit (${payout.extraDayBenefit.days} days)`, fontSize: 10 },
                { text: (payout.extraDayBenefit.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }

        // Build the table body by merging rows
        const maxRows = Math.max(earningRows.length, deductionRows.length);
        const tableBody = [
            [
                { text: 'EARNINGS', style: 'earningsHeader' },
                { text: 'AMOUNT', style: 'earningsHeader' },
                { text: 'DEDUCTIONS', style: 'deductionsHeader' },
                { text: 'AMOUNT', style: 'deductionsHeader' }
            ]
        ];

        let totalEarnings = 0;
        let totalDeductions = 0;

        for (let i = 0; i < maxRows; i++) {
            const e = earningRows[i] || [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }];
            const d = deductionRows[i] || [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }];
            tableBody.push([...e, ...d]);
            if (earningRows[i]) totalEarnings += parseFloat(e[1].text.replace(/,/g, '')) || 0;
            if (deductionRows[i]) totalDeductions += parseFloat(d[1].text.replace(/,/g, '')) || 0;
        }

        // Summary Row
        tableBody.push([
            { text: 'Total Earnings', bold: true, fontSize: 11, fillColor: '#f8fafc' },
            { text: totalEarnings.toLocaleString(), bold: true, fontSize: 11, alignment: 'right', fillColor: '#f8fafc' },
            { text: 'Total Deductions', bold: true, fontSize: 11, fillColor: '#f8fafc' },
            { text: totalDeductions.toLocaleString(), bold: true, fontSize: 11, alignment: 'right', fillColor: '#f8fafc' }
        ]);

        const docDefinition = {
            content: [
                // Header Region
                { text: company?.companyName || 'COMPANY NAME', style: 'header' },
                { text: `${company?.address || ''}${company?.pincode ? ', ' + company.pincode : ''}`, style: 'subHeader' },
                { text: `Email: ${company?.companyEmail || 'N/A'} | Contact: ${company?.companyContact || 'N/A'}`, style: 'subHeader' },
                { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e2e8f0' }] },

                { text: `PAYSLIP FOR THE MONTH OF ${payout.month}`, style: 'title' },

                // Employee Details Table
                {
                    table: {
                        widths: ['20%', '30%', '20%', '30%'],
                        body: [
                            [
                                { text: 'Employee Name:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.name || 'N/A', fontSize: 10 },
                                { text: 'Employee ID:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.employeeId || 'N/A', fontSize: 10 }
                            ],
                            [
                                { text: 'Department:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.department || 'N/A', fontSize: 10 },
                                { text: 'Designation:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.designation || 'N/A', fontSize: 10 }
                            ],
                            [
                                { text: 'Generated On:', bold: true, fontSize: 10 },
                                { text: new Date().toLocaleDateString(), fontSize: 10 },
                                { text: '', fontSize: 10 },
                                { text: '', fontSize: 10 }
                            ]
                        ]
                    },
                    layout: 'noBorders',
                    margin: [0, 10, 0, 20]
                },

                // Attendance Summary
                { text: 'ATTENDANCE SUMMARY', style: 'sectionHeader' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', '*', '*', '*', '*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Present', style: 'tableHeader' },
                                { text: 'Half Day', style: 'tableHeader' },
                                { text: 'Absent', style: 'tableHeader' },
                                { text: 'Paid LV', style: 'tableHeader' },
                                { text: 'Unpaid LV', style: 'tableHeader' },
                                { text: 'Ex. Days', style: 'tableHeader' },
                                { text: 'Week Off', style: 'tableHeader' },
                                { text: 'Holiday', style: 'tableHeader' }
                            ],
                            [
                                { text: payout.attendance.present, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.halfDay, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.absent, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.paidLeave, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.unpaidLeave, alignment: 'center', fontSize: 9 },
                                { text: payout.extraDayBenefit?.days || 0, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.weekOff, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.holiday, alignment: 'center', fontSize: 9 }
                            ]
                        ]
                    },
                    margin: [0, 5, 0, 20]
                },

                // Earnings & Deductions (Dynamic)
                {
                    table: {
                        headerRows: 1,
                        widths: ['35%', '15%', '35%', '15%'],
                        body: tableBody
                    },
                    margin: [0, 0, 0, 20]
                },

                // Net Amount Area
                {
                    table: {
                        widths: ['*', '35%'],
                        body: [
                            [
                                { text: 'NET PAYABLE:', bold: true, fontSize: 13, color: '#0f172a', margin: [0, 5, 0, 5] },
                                { text: ` ${payout.finalPayout.toLocaleString()}`, bold: true, fontSize: 16, color: '#0f172a', alignment: 'right', margin: [0, 5, 0, 5] }
                            ]
                        ]
                    },
                    layout: {
                        fillColor: '#eff6ff',
                        hLineWidth: () => 1,
                        vLineWidth: () => 0,
                        hLineColor: '#bfdbfe'
                    }
                },

                { text: `(Rupees ${amountToWords(payout.finalPayout)} Only)`, fontSize: 10, italics: true, margin: [0, 10, 0, 0], alignment: 'right' },

                // Add Remarks/Notes if present
                payoutDescription ? {
                    margin: [0, 15, 0, 0],
                    table: {
                        widths: ['*'],
                        body: [
                            [
                                {
                                    fillColor: '#f8fafc',
                                    border: [true, true, true, true],
                                    borderColor: '#e2e8f0',
                                    text: [
                                        { text: 'Note / Remarks:\n', bold: true, fontSize: 9, color: '#334155' },
                                        { text: payoutDescription, fontSize: 9, color: '#475569' }
                                    ],
                                    margin: [8, 8, 8, 8]
                                }
                            ]
                        ]
                    }
                } : null,

                // Footer Region
                { text: 'This is a computer-generated document and does not require a physical signature.', style: 'footer', margin: [0, 20, 0, 0] },

                // Page 2: Day-wise Salary Breakdown
                { text: '', pageBreak: 'before' },
                { text: company?.companyName || 'COMPANY NAME', style: 'header' },
                { text: `Payslip Report - ${payout.month}`, style: 'title' },
                { text: 'DAY-WISE ATTENDANCE & EARNINGS BREAKDOWN', style: 'sectionHeader', alignment: 'center', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['18%', '16%', '22%', '14%', '12%', '18%'],
                        body: daywiseRows
                    },
                    margin: [0, 5, 0, 15]
                },
                { text: '* Earned Pay represents the pro-rated daily salary based on actual status and shift multipliers (if applicable), minus daily penalties.', fontSize: 8, italics: true, color: '#64748b', alignment: 'center' }
            ],
            styles: {
                header: { fontSize: 22, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 0, 0, 5] },
                subHeader: { fontSize: 9, color: '#475569', alignment: 'center', margin: [0, 0, 0, 2] },
                title: { fontSize: 12, bold: true, alignment: 'center', margin: [0, 15, 0, 15], color: '#334155', background: '#f8fafc' },
                sectionHeader: { fontSize: 10, bold: true, margin: [0, 0, 0, 8], color: '#334155', letterSpacing: 1 },
                tableHeader: { bold: true, fontSize: 9, alignment: 'center', fillColor: '#334155', color: 'white', margin: [0, 4, 0, 4] },
                earningsHeader: { bold: true, fontSize: 10, fillColor: '#1e293b', color: 'white', margin: [0, 4, 0, 4] },
                deductionsHeader: { bold: true, fontSize: 10, fillColor: '#475569', color: 'white', margin: [0, 4, 0, 4] },
                footer: { fontSize: 8, italics: true, color: '#94a3b8', alignment: 'center', margin: [0, 40, 0, 0] }
            },
            defaultStyle: { font: 'Roboto' }
        };

        // Helper function for amount to words
        function amountToWords(amount) {
            const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
            const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

            function inWords(num) {
                if ((num = num.toString()).length > 9) return 'overflow';
                const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
                if (!n) return ''; let str = '';
                str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
                str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
                str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
                str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
                str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
                return str.trim();
            }

            const parts = Number(amount).toFixed(2).split('.');
            let rupeesPart = inWords(parts[0]);
            if (!rupeesPart || rupeesPart === '') rupeesPart = 'Zero';

            let paisePart = Number(parts[1]) > 0 ? ' and ' + inWords(parts[1]) + ' Paise' : '';

            return rupeesPart + paisePart;
        }

        const pdfDoc = await pdfmake.createPdf(docDefinition);
        const buffer = await pdfDoc.getBuffer();

        res.setHeader('Content-Type', 'application/pdf');
        const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
        res.setHeader('Content-Disposition', `${disposition}; filename=payslip-${payout.month}.pdf`);

        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("downloadPayslip error:", error);
        res.status(500).json({ success: false, message: "Failed to generate PDF" });
    }
};

export const deletePayout = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        // Verify the payout record belongs to this admin's workspace
        const payout = await Payout.findOne({ _id: id, adminId });

        if (!payout) return res.status(404).json({ success: false, message: "Record not found" });
        if (payout.status === 'Published') {
            // Optional: You might want to restrict deleting published slips, 
            // but for recovery purposes we allow it here.
        }

        await Payout.findOneAndDelete({ _id: id, adminId });
        res.status(200).json({ success: true, message: "Payout record cleared successfully" });
    } catch (error) {
        console.error("deletePayout error:", error);
        res.status(500).json({ success: false, message: "Failed to delete record" });
    }
};

export const getPayoutHistory = async (req, res) => {
    try {
        const { month, employeeId } = req.query;
        const adminId = req.user._id;

        let query = {};
        if (month) query.month = month;

        if (employeeId) {
            // Verify employee belongs to this admin's workspace
            const empExists = await User.findOne({ _id: employeeId, adminId });
            if (!empExists) {
                return res.status(403).json({ success: false, message: "Access denied." });
            }
            query.employeeId = employeeId;
        } else {
            const employees = await User.find({ adminId }).select('_id');
            const employeeIds = employees.map(emp => emp._id);
            query.employeeId = { $in: employeeIds };
        }

        const history = await Payout.find(query)
            .populate('employeeId', 'name employeeId department designation')
            .populate('initiatedBy', 'name')
            .sort({ initiatedAt: -1 });

        res.status(200).json({ success: true, history });
    } catch (error) {
        console.error("getPayoutHistory error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payout history" });
    }
};

export const getDaywisePayoutBreakdown = async (req, res) => {
    try {
        const { id } = req.params; // Payout ID
        const payout = await Payout.findById(id).populate('employeeId', 'name employeeId department designation adminId workSetup');
        if (!payout) return res.status(404).json({ success: false, message: "Payslip/Payout not found" });

        // Security check: must be owner or admin of the same company
        const isAdmin = req.user.role === 'Admin';
        const isOwner = payout.employeeId?._id?.toString() === req.user._id.toString();
        const isSameOrg = isAdmin && payout.employeeId?.adminId?.toString() === req.user._id.toString();

        if (!isSameOrg && !isOwner) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        const employeeId = payout.employeeId?._id;
        const month = payout.month; // YYYY-MM
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const startDate = `${month}-01`;
        const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

        // Fetch User with populated shift & salaryGroup
        const user = await User.findById(employeeId)
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup');

        const shift = user?.workSetup?.shift;
        const salaryGroup = user?.workSetup?.salaryGroup;

        // Fetch Attendance records
        const monthAttendance = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate, $lte: endDate }
        });
        const attendanceMap = {};
        monthAttendance.forEach(a => { attendanceMap[a.date] = a; });

        // Fetch Approved Leaves
        const approvedLeaves = await Request.find({
            employee: employeeId,
            requestType: 'Leave',
            status: 'Approved',
            date: { $gte: startDate, $lte: endDate }
        });
        const leavesMap = {};
        approvedLeaves.forEach(l => {
            leavesMap[l.date] = l;
        });

        // Fetch Holidays
        const monthHolidays = await Holiday.find({
            adminId: user?.adminId || payout.initiatedBy,
            year: year,
            date: { $gte: startDate, $lte: endDate },
            status: 'Active'
        });
        const holidayPaidMap = {};
        monthHolidays.forEach(h => {
            holidayPaidMap[h.date] = {
                name: h.holidayName,
                isPaid: h.isPaid !== false
            };
        });

        // Divisor based on salary group setting
        const isFixed = salaryGroup?.workingDaysType === 'Fixed Working Days';
        const baseDays = isFixed ? (salaryGroup?.fixedDays || 26) : daysInMonth;

        const perDayGross = payout.joiningMonthlyGross ? (payout.joiningMonthlyGross / baseDays) : 0;
        const perDayNet = payout.joiningNetSalary ? (payout.joiningNetSalary / baseDays) : 0;

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Shift multiplier for extra hours on weekoff/holiday
        const multiplierStr = shift?.extraPayoutMultiplier || 'Default';
        let totalMultiplier = 1;
        if (multiplierStr === '1x') totalMultiplier = 1;
        else if (multiplierStr === '1.5x') totalMultiplier = 1.5;
        else if (multiplierStr === '2x' || multiplierStr === 'Default') totalMultiplier = 2;

        const daywiseBreakdown = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${month}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, monthNum - 1, d);
            const dayName = daysOfWeek[dateObj.getDay()];
            const isWeekOff = shift?.weekOffDays?.includes(dayName);

            const attendanceRecord = attendanceMap[dayStr];
            const leaveRecord = leavesMap[dayStr];
            const holidayRecord = holidayPaidMap[dayStr];

            let status = 'Absent';
            let punchIn = '--';
            let punchOut = '--';
            let latePenalty = 0;
            let earlyPenalty = 0;
            let totalBreaks = 0;
            let workedMins = 0;
            let earnedAmount = 0;
            let rateDescription = '';

            // 1. Core Attendance details
            if (attendanceRecord) {
                workedMins = computeWorkingMinutes(attendanceRecord.punches, attendanceRecord.breaks);

                const firstIn = attendanceRecord.punches.find(p => p.type === 'IN');
                const lastOut = [...attendanceRecord.punches].reverse().find(p => p.type === 'OUT');

                if (firstIn) {
                    punchIn = new Date(firstIn.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                    });
                }
                if (lastOut) {
                    punchOut = new Date(lastOut.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                    });
                }

                latePenalty = attendanceRecord.lateInPenalty?.amount || 0;
                earlyPenalty = attendanceRecord.earlyOutPenalty?.amount || 0;
                totalBreaks = attendanceRecord.breaks?.length || 0;

                status = attendanceRecord.status;
            } else {
                if (isWeekOff) {
                    status = 'Week Off';
                } else if (holidayRecord) {
                    status = 'Holiday';
                }
            }

            // Approved Leave overrides
            if (leaveRecord) {
                status = leaveRecord.leaveCategory === 'Paid' ? 'Paid Leave' : 'Unpaid Leave';
                if (leaveRecord.leaveDuration === 'Half Day') {
                    status = leaveRecord.leaveCategory === 'Paid' ? 'Paid Leave (Half)' : 'Unpaid Leave (Half)';
                }
            }

            // 2. Earnings logic per day status
            if (status === 'Present') {
                if (isWeekOff) {
                    earnedAmount = perDayNet * totalMultiplier;
                    rateDescription = `Present on Week Off (${totalMultiplier}x pay)`;
                } else if (holidayRecord) {
                    earnedAmount = perDayNet * totalMultiplier;
                    rateDescription = `Present on Holiday (${totalMultiplier}x pay)`;
                } else {
                    earnedAmount = perDayNet;
                    rateDescription = 'Regular Day Pay';
                }
            } else if (status === 'Half Day') {
                if (isWeekOff) {
                    earnedAmount = perDayNet * 0.5 * totalMultiplier;
                    rateDescription = `Half Day on Week Off (${totalMultiplier}x pay)`;
                } else if (holidayRecord) {
                    earnedAmount = perDayNet * 0.5 * totalMultiplier;
                    rateDescription = `Half Day on Holiday (${totalMultiplier}x pay)`;
                } else {
                    earnedAmount = perDayNet * 0.5;
                    rateDescription = 'Half Day Pay';
                }
            } else if (status === 'Paid Leave') {
                earnedAmount = perDayNet;
                rateDescription = 'Approved Paid Leave';
            } else if (status === 'Paid Leave (Half)') {
                earnedAmount = perDayNet * 0.5;
                rateDescription = 'Approved Paid Leave (Half)';
            } else if (status === 'Week Off') {
                earnedAmount = perDayNet;
                rateDescription = 'Paid Week Off';
            } else if (status === 'Holiday') {
                if (!holidayRecord || holidayRecord.isPaid) {
                    earnedAmount = perDayNet;
                    rateDescription = `Paid Holiday (${holidayRecord?.name || 'Company Holiday'})`;
                } else {
                    earnedAmount = 0;
                    rateDescription = `Unpaid Holiday (${holidayRecord?.name || 'Company Holiday'})`;
                }
            } else {
                // Unpaid Leave / Unpaid Leave (Half) / Absent
                earnedAmount = 0;
                rateDescription = status === 'Absent' ? 'Absent (Unpaid)' : 'Approved Unpaid Leave';
            }

            const netDailyEarned = Math.max(0, earnedAmount - latePenalty - earlyPenalty);

            daywiseBreakdown.push({
                date: dayStr,
                dayName,
                status,
                punchIn,
                punchOut,
                workedMins,
                workedHours: Math.floor(workedMins / 60) + 'h ' + (workedMins % 60) + 'm',
                latePenalty,
                earlyPenalty,
                totalPenalty: latePenalty + earlyPenalty,
                baseEarned: parseFloat(earnedAmount.toFixed(2)),
                netEarned: parseFloat(netDailyEarned.toFixed(2)),
                rateDescription,
                isHoliday: !!holidayRecord,
                holidayName: holidayRecord?.name || '',
                isWeekOff
            });
        }

        const [breakdownYear, breakdownMonthNum] = payout.month.split('-').map(Number);
        const slipRecord = await SalarySlip.findOne({
            employeeId: payout.employeeId?._id,
            month: breakdownMonthNum,
            year: breakdownYear
        });
        const payoutDescription = payout.description || slipRecord?.description || "";

        res.status(200).json({
            success: true,
            month,
            employeeName: payout.employeeId?.name,
            employeeId: payout.employeeId?.employeeId,
            joiningNetSalary: payout.joiningNetSalary,
            joiningMonthlyGross: payout.joiningMonthlyGross,
            perDayNet: parseFloat(perDayNet.toFixed(2)),
            days: daywiseBreakdown,
            description: payoutDescription
        });

    } catch (error) {
        console.error("getDaywisePayoutBreakdown error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
