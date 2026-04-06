import PenaltyRule from "../models/PenaltyRule.Model.js";
import User from "../models/User.Model.js";
import Branch from "../models/Branch.Model.js";
import BreakType from "../models/BreakType.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";
import EmployeeCTC from "../models/EmployeeCTC.Model.js";
import { computeWorkingMinutes } from "../utils/attendance.js";
import { calculatePenaltyAmount } from "./PenaltyRule.Controller.js";

export const getEmployeeStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const employee = await User.findById(userId)
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup')
            .populate('leaveGroup')
            .populate('documents.documentType')
            .select('-password');

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const emp = employee.toObject();
        const shift = emp.workSetup?.shift || null;
        const salaryGroup = emp.workSetup?.salaryGroup || null;

        // Fetch Penalty Rule once if shift exists
        const penaltyRule = shift ? await PenaltyRule.findOne({ shift: shift._id }) : null;

        // Month stats based on Salary Cycle Start Date
        const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
        const cycleStartDay = salaryGroup?.salaryCycleStartDate || 1;
        
        let cycleStart = new Date(istNow);
        cycleStart.setUTCHours(0,0,0,0);
        
        if (istNow.getUTCDate() < cycleStartDay) {
            cycleStart.setUTCMonth(cycleStart.getUTCMonth() - 1);
        }
        cycleStart.setUTCDate(cycleStartDay);

        const monthAttendance = await Attendance.find({ 
            employee: userId,
            date: { $gte: cycleStart.toISOString().split('T')[0] }
        }).sort({ date: 1 });

        let monthWorkMins = 0;
        let monthPenalty = 0;
        let lateInMonthCount = 0; // Local tracker for grace periods
        const penaltyHistory = [];

        for (const a of monthAttendance) {
            monthWorkMins += computeWorkingMinutes(a.punches, a.breaks);

            // Calculate/Verify late penalty
            let lateAmount = a.lateInPenalty?.amount || 0;
            const isLate = a.lateInPenalty?.isLate || false;

            if (isLate && shift) {
                const firstIn = a.punches?.find(p => p.type === 'IN');
                if (firstIn) {
                    const days2 = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
                    const recordDate = new Date(a.date + 'T00:00:00+05:30');
                    const dayName = days2[recordDate.getDay()];
                    const daySchedule = shift.schedule?.[dayName];
                    if (daySchedule?.shiftStart) {
                        const shiftStartMins = parseInt(daySchedule.shiftStart.split(':')[0]) * 60 + parseInt(daySchedule.shiftStart.split(':')[1]);
                        const inTime = new Date(firstIn.time);
                        const istIn = new Date(inTime.getTime() + (5.5 * 60 * 60 * 1000));
                        const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
                        const lateByMins = inMins - shiftStartMins;
                        
                        if (lateByMins > 0) {
                            // Use cached penaltyRule and local lateCount for high performance
                            lateAmount = await calculatePenaltyAmount(shift._id, lateByMins, userId, penaltyRule, lateInMonthCount);
                        }
                    }
                }
                lateInMonthCount++; // Increment count for next iteration
            }

            if (lateAmount > 0) {
                penaltyHistory.push({ date: a.date, amount: lateAmount, type: 'Late In' });
            }
            if (a.earlyOutPenalty?.amount > 0) {
                penaltyHistory.push({ date: a.date, amount: a.earlyOutPenalty.amount, type: 'Early Out' });
            }
            monthPenalty += lateAmount + (a.earlyOutPenalty?.amount || 0);
        }
        const monthHours = Math.floor(monthWorkMins / 60);
        const presentDays = monthAttendance.filter(a => a.status === 'Present').length;
        const halfDays = monthAttendance.filter(a => a.status === 'Half Day').length;
        const weekOffs = monthAttendance.filter(a => a.status === 'Week Off').length;
        const holidays = monthAttendance.filter(a => a.status === 'Holiday').length;

        // Get day name (IST)
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = days[istNow.getUTCDay()];

        // Build shift info
        let schedule = shift?.schedule?.[todayName] || null;
        const isWeekOff = shift?.weekOffDays?.includes(todayName.charAt(0).toUpperCase() + todayName.slice(1)) || false;

        // If it's a week off and schedule is empty, try to find a fallback from weekdays
        if (isWeekOff && (!schedule || !schedule.shiftStart)) {
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            for (const day of weekdays) {
                if (shift?.schedule?.[day]?.shiftStart) {
                    schedule = shift.schedule[day];
                    break;
                }
            }
        }

        // Build leave balance info from leaveGroup or direct user field
        const leaveGroup = emp.leaveGroup || null;
        const totalLeaves = emp.noOfPaidLeaves || leaveGroup?.noOfPaidLeaves || 0;
        const hasLeaveGroup = !!emp.leaveGroup;
        
        // Count approved leaves (Paid and Unpaid)
        const usedPaidLeaves = await Request.countDocuments({
            employee: userId,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Paid',
            date: { $gte: cycleStart.toISOString().split('T')[0] }
        });

        const usedUnpaidLeaves = await Request.countDocuments({
            employee: userId,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Unpaid',
            date: { $gte: cycleStart.toISOString().split('T')[0] }
        });

        // Document count
        const documentCount = emp.documents?.length || 0;

        // Days since joining
        let daysSinceJoining = null;
        if (emp.dateJoined) {
            const joined = new Date(emp.dateJoined);
            const now = new Date();
            daysSinceJoining = Math.floor((now - joined) / (1000 * 60 * 60 * 24));
        }

        // Fetch branch coordinates
        let branchCoords = null;
        const targetBranch = (emp.branch || '').trim();
        
        if (targetBranch) {
            // Find branch by name (case-insensitive & literal match)
            // Using literal name first to avoid regex issues
            let branch = await Branch.findOne({ 
                branchName: targetBranch,
                adminId: emp.adminId || userId
            });

            if (!branch) {
                // Regex fallback if direct match fails
                const escaped = targetBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                branch = await Branch.findOne({ 
                    branchName: { $regex: new RegExp(`^${escaped}$`, 'i') },
                    adminId: emp.adminId || userId
                });
            }
            
            if (branch) {
                branchCoords = {
                    latitude: branch.latitude || 0,
                    longitude: branch.longitude || 0,
                    radius: branch.radius || 200 // Default 200 meters if not set
                };
            }
        }

        // --- CALCULATE ACCRUED SALARY AS PER VALUES ---
        const ctc = await EmployeeCTC.findOne({ employeeId: userId, status: 'Active' });
        let accruedGross = 0;
        let accruedNet = 0;
        let unpaidLeaveDeduction = 0;

        if (ctc) {
            // Determine working days base
            const isFixed = salaryGroup?.workingDaysType === 'Fixed Working Days';
            const baseDays = isFixed ? (salaryGroup?.fixedDays || 26) : new Date(cycleStart.getUTCFullYear(), cycleStart.getUTCMonth() + 1, 0).getDate();

            const perDayGross = (ctc.monthlyGross || 0) / baseDays;
            const perDayNet = (ctc.netSalary || 0) / baseDays;

            // 6. Calculate Payable Days (The core for both logic types)
            const payableDays = presentDays + (halfDays * 0.5) + weekOffs + holidays + usedPaidLeaves;

            if (isFixed) {
                // FIXED LOGIC (e.g., Fixed 28)
                // We multiply the 'Daily Rate' by the 'Payable Days' found in the month.
                // If they worked 28+ days, they get full 28 pay.
                // If they worked less, they get (Worked/28) * Gross.
                const cappedPayable = Math.min(baseDays, payableDays);
                const lopDays = baseDays - cappedPayable;
                
                unpaidLeaveDeduction = perDayGross * (lopDays + usedUnpaidLeaves);
                accruedGross = perDayGross * cappedPayable;
                accruedNet = (perDayNet * cappedPayable) - monthPenalty;
            } else {
                // CALENDAR DAYS LOGIC
                unpaidLeaveDeduction = perDayGross * usedUnpaidLeaves;
                accruedGross = perDayGross * payableDays;
                accruedNet = (perDayNet * payableDays) - monthPenalty;
            }

            // Apply Rounding if policy set to "Yes"
            if (salaryGroup?.roundedSalary === 'Yes') {
                accruedGross = Math.round(accruedGross);
                accruedNet = Math.round(accruedNet);
                unpaidLeaveDeduction = Math.round(unpaidLeaveDeduction);
            } else {
                accruedGross = parseFloat(accruedGross.toFixed(2));
                accruedNet = parseFloat(accruedNet.toFixed(2));
                unpaidLeaveDeduction = parseFloat(unpaidLeaveDeduction.toFixed(2));
            }
        }

        res.status(200).json({
            success: true,
            employee: {
                _id: emp._id,
                name: emp.name,
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                phone: emp.phone,
                employeeId: emp.employeeId,
                designation: emp.designation,
                department: emp.department,
                branch: emp.branch,
                dateJoined: emp.dateJoined,
                employmentType: emp.employmentType,
                status: emp.status,
                profilePhoto: emp.profilePhoto,
                gender: emp.gender,
                dateOfBirth: emp.dateOfBirth,
                bloodGroup: emp.bloodGroup,
                maritalStatus: emp.maritalStatus,
                nationality: emp.nationality,
                address: emp.address,
                currentAddress: emp.currentAddress,
                permanentAddress: emp.permanentAddress,
                emergencyContact: emp.emergencyContact,
                reportingTo: emp.reportingTo,
                workSetup: emp.workSetup,
                salaryDetails: emp.salaryDetails,
                documents: emp.documents,
                pastExperience: emp.pastExperience,
                grade: emp.grade,
                employeeLevel: emp.employeeLevel,
            },
            stats: {
                hasLeaveGroup,
                totalLeaves,
                leavePolicy: leaveGroup?.leaveBalanceVisibility === 'Multiple of 1' ? 'Multiple of 1' : 'Multiple of 0.5',
                maxUsagePerMonth: leaveGroup?.maxUseInMonth || totalLeaves,
                usedLeaves: usedPaidLeaves,
                usedUnpaidLeaves,
                documentCount,
                daysSinceJoining,
                monthHours,
                monthPenalty,
                unpaidLeaveDeduction,
                accruedGross,
                accruedNet,
                penaltyHistory,
                presentDays,
                salaryCycle: {
                    start: cycleStart.toISOString().split('T')[0],
                    today: istNow.toISOString().split('T')[0]
                },
                shiftName: shift?.shiftName || null,
                shiftStart: schedule?.shiftStart || null,
                shiftEnd: schedule?.shiftEnd || null,
                lunchStart: schedule?.lunchStart || null,
                lunchEnd: schedule?.lunchEnd || null,
                teaStart: schedule?.teaStart || null,
                teaEnd: schedule?.teaEnd || null,
                breakMode: shift?.breakMode || 'Defined Minutes',
                maxPersonalBreak: shift?.maxPersonalBreak || 0,
                isWeekOff,
                weekOffType: shift?.weekOffType || 'Selected Weekdays',
                weekOffDays: shift?.weekOffDays || [],
                weekOffsPerWeek: shift?.weekOffsPerWeek || 0,
                weekOffsPerMonth: shift?.weekOffsPerMonth || 0,
                requireOutOfRangeReason: shift?.requireOutOfRangeReason || false,
                requireLateReason: shift?.requireLateReason || false,
                requireEarlyOutReason: shift?.requireEarlyOutReason || false,
                lateEarlyApplyOnExtraDay: shift?.lateEarlyApplyOnExtraDay || false,
                lateEarlyType: shift?.lateEarlyType || 'Combined',
                maxLateInMinutes: shift?.maxLateInMinutes || 0,
                maxEarlyOutMinutes: shift?.maxEarlyOutMinutes || 0,
                missingPunchCount: monthAttendance.filter(a => 
                    a.punches.some(p => p.type === 'IN') && 
                    !a.punches.some(p => p.type === 'OUT') && 
                    a.date !== istNow.toISOString().split('T')[0]
                ).length,
                leaveGroupName: leaveGroup?.leaveGroupName || null,
                branchCoords,
                availableBreaks: await BreakType.find({ 
                    adminId: emp.adminId || emp._id, 
                    isActive: true 
                }).sort({ order: 1 }),
                canApplyUnpaidLeave: emp.canApplyUnpaidLeave || false
            }
        });
    } catch (error) {
        console.error("Error in getEmployeeStats:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
