import PenaltyRule from "../models/PenaltyRule.Model.js";
import User from "../models/User.Model.js";
import Branch from "../models/Branch.Model.js";
import BreakType from "../models/BreakType.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";
import EmployeeCTC from "../models/EmployeeCTC.Model.js";
import LeaveGroup from "../models/LeaveGroup.Model.js";
import Holiday from "../models/Holiday.Model.js";
import { computeWorkingMinutes } from "../utils/attendance.js";
import { calculatePenaltyAmount } from "./PenaltyRule.Controller.js";

// Helper to get all overlapping days of a range [fromDateStr, toDateStr] in a given year-month YYYY-MM
const getOverlappingDaysInMonth = (fromDateStr, toDateStr, leaveDuration, yearMonthStr) => {
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
                const days2 = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
                const recordDate = new Date(a.date + 'T00:00:00+05:30');
                const dayName = days2[recordDate.getDay()];
                const isWeekOffCurrent = shift?.weekOffDays?.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1)) || false;
                
                // Skip if it's a week off and settings say don't apply
                if (!(isWeekOffCurrent && !shift.lateEarlyApplyOnExtraDay)) {
                    const firstIn = a.punches?.find(p => p.type === 'IN');
                    if (firstIn) {
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
                } else {
                    lateAmount = 0; // Ensure 0 if policy says so
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
        // Exclude leave-based half-days — those are already counted in usedPaidLeaves/usedUnpaidLeaves
        const halfDays = monthAttendance.filter(a => a.status === 'Half Day' && !a.leaveCategory).length;
        const weekOffs = monthAttendance.filter(a => a.status === 'Week Off').length;

        // Load holiday pay config for the cycle's date range so we only count paid holidays
        const cycleStartStr = cycleStart.toISOString().split('T')[0];
        const adminId = employee.adminId;
        const holidayRecords = await Holiday.find({
            adminId,
            date: { $gte: cycleStartStr },
            status: 'Active'
        });
        const holidayPaidMap = {};
        holidayRecords.forEach(h => { holidayPaidMap[h.date] = h.isPaid !== false; });

        const holidays = monthAttendance.filter(a =>
            a.status === 'Holiday' && holidayPaidMap[a.date] !== false
        ).length;

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
        const populatedLG = emp.leaveGroup || null;
        const leaveGroupDb = populatedLG ? await LeaveGroup.findById(populatedLG._id || populatedLG) : null;
        const leaveGroup = leaveGroupDb || populatedLG;
        const totalLeaves = emp.noOfPaidLeaves || leaveGroup?.noOfPaidLeaves || 0;
        const hasLeaveGroup = !!emp.leaveGroup;
        
        const currentYearMonth = istNow.toISOString().substring(0, 7);
        const [cy, cm] = currentYearMonth.split('-').map(Number);
        const lastDay = new Date(cy, cm, 0).getDate();
        const calMonthStart = `${currentYearMonth}-01`;
        const calMonthEnd = `${currentYearMonth}-${String(lastDay).padStart(2, '0')}`;

        // Sum approved leave days (Paid and Unpaid) for current calendar month using overlap logic
        const paidRequests = await Request.find({
            employee: userId,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Paid',
            fromDate: { $lte: calMonthEnd },
            toDate: { $gte: calMonthStart }
        });
        let usedPaidLeaves = 0;
        paidRequests.forEach(req => {
            usedPaidLeaves += getOverlappingDaysInMonth(req.fromDate, req.toDate, req.leaveDuration, currentYearMonth);
        });

        // Sum pending paid leave requests to count towards monthly usage limits
        const pendingPaidReqs = await Request.find({
            employee: userId,
            requestType: 'Leave',
            status: 'Pending',
            leaveCategory: 'Paid',
            fromDate: { $lte: calMonthEnd },
            toDate: { $gte: calMonthStart }
        });
        let pendingPaidLeaves = 0;
        pendingPaidReqs.forEach(req => {
            pendingPaidLeaves += getOverlappingDaysInMonth(req.fromDate, req.toDate, req.leaveDuration, currentYearMonth);
        });

        const unpaidRequests = await Request.find({
            employee: userId,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Unpaid',
            fromDate: { $lte: calMonthEnd },
            toDate: { $gte: calMonthStart }
        });
        let usedUnpaidLeaves = 0;
        unpaidRequests.forEach(req => {
            usedUnpaidLeaves += getOverlappingDaysInMonth(req.fromDate, req.toDate, req.leaveDuration, currentYearMonth);
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
        // --- Calculate Expected Days and Hours in Backend ---
        let expectedDaysMTD = 0;
        let expectedHoursMTD = 0;
        let expectedDaysTotal = 0;
        let expectedHoursTotal = 0;

        if (shift) {
            const woDays = shift.weekOffDays || [];
            const joiningDate = emp.dateJoined ? new Date(emp.dateJoined) : null;

            const parseTime = (timeStr) => {
                if (!timeStr) return 0;
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
            };

            let effectiveStart = new Date(cycleStart);
            if (joiningDate && joiningDate > effectiveStart) {
                effectiveStart = new Date(joiningDate);
                effectiveStart.setUTCHours(0,0,0,0);
            }

            const mtdEnd = new Date(istNow);
            mtdEnd.setUTCHours(23,59,59,999);

            const cycleEnd = new Date(cycleStart);
            cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + 1);
            cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1);
            cycleEnd.setUTCHours(23,59,59,999);

            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

            let expectedMinsMTD = 0;
            let curr = new Date(effectiveStart);
            while (curr <= mtdEnd) {
                const dayIndex = curr.getUTCDay();
                const dayName = daysOfWeek[dayIndex];
                const isWO = woDays.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                if (!isWO) {
                    expectedDaysMTD++;

                    const daySchedule = shift.schedule?.[dayName];
                    const dayStart = daySchedule?.shiftStart;
                    const dayEnd = daySchedule?.shiftEnd;

                    if (dayStart && dayEnd) {
                        let diff = parseTime(dayEnd) - parseTime(dayStart);
                        if (diff < 0) diff += 24 * 60; // Overnight
                        
                        let breakMins = 0;
                        if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                            const d = parseTime(daySchedule.lunchEnd) - parseTime(daySchedule.lunchStart);
                            if (d > 0) breakMins += d;
                        }
                        if (daySchedule.teaStart && daySchedule.teaEnd) {
                            const d = parseTime(daySchedule.teaEnd) - parseTime(daySchedule.teaStart);
                            if (d > 0) breakMins += d;
                        }
                        diff = Math.max(0, diff - breakMins);
                        expectedMinsMTD += diff;
                    } else {
                        expectedMinsMTD += 8 * 60;
                    }
                }
                curr.setUTCDate(curr.getUTCDate() + 1);
            }
            expectedHoursMTD = Math.round(expectedMinsMTD / 60);

            let expectedMinsTotal = 0;
            curr = new Date(effectiveStart);
            while (curr <= cycleEnd) {
                const dayIndex = curr.getUTCDay();
                const dayName = daysOfWeek[dayIndex];
                const isWO = woDays.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                if (!isWO) {
                    expectedDaysTotal++;

                    const daySchedule = shift.schedule?.[dayName];
                    const dayStart = daySchedule?.shiftStart;
                    const dayEnd = daySchedule?.shiftEnd;

                    if (dayStart && dayEnd) {
                        let diff = parseTime(dayEnd) - parseTime(dayStart);
                        if (diff < 0) diff += 24 * 60; // Overnight
                        
                        let breakMins = 0;
                        if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                            const d = parseTime(daySchedule.lunchEnd) - parseTime(daySchedule.lunchStart);
                            if (d > 0) breakMins += d;
                        }
                        if (daySchedule.teaStart && daySchedule.teaEnd) {
                            const d = parseTime(daySchedule.teaEnd) - parseTime(daySchedule.teaStart);
                            if (d > 0) breakMins += d;
                        }
                        diff = Math.max(0, diff - breakMins);
                        expectedMinsTotal += diff;
                    } else {
                        expectedMinsTotal += 8 * 60;
                    }
                }
                curr.setUTCDate(curr.getUTCDate() + 1);
            }
            expectedHoursTotal = Math.round(expectedMinsTotal / 60);
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
                maxUsagePerMonth: (emp.maxPLMonth && emp.maxPLMonth > 0) ? emp.maxPLMonth : (leaveGroup?.maxUseInMonth !== null && leaveGroup?.maxUseInMonth !== undefined ? leaveGroup.maxUseInMonth : totalLeaves),
                usedLeaves: usedPaidLeaves + pendingPaidLeaves,
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
                expectedDaysMTD,
                expectedHoursMTD,
                expectedDaysTotal,
                expectedHoursTotal,
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
                // Unified Grace Period: max of shift setting and penalty min threshold
                effectiveMaxLate: (() => {
                    const shiftGrace = shift?.maxLateInMinutes || 0;
                    const lateSlabs = penaltyRule?.slabs?.filter(s => s.penaltyType === 'Late In Minutes') || [];
                    const minPenaltyMins = lateSlabs.length > 0 ? Math.min(...lateSlabs.map(s => s.minTime || 0)) : Infinity;
                    return Math.max(shiftGrace, minPenaltyMins === Infinity ? 0 : minPenaltyMins - 1);
                })(),
                effectiveMaxEarly: (() => {
                    const shiftGrace = shift?.maxEarlyOutMinutes || 0;
                    const earlySlabs = penaltyRule?.slabs?.filter(s => s.penaltyType === 'Early Out Minutes') || [];
                    const minPenaltyMins = earlySlabs.length > 0 ? Math.min(...earlySlabs.map(s => s.minTime || 0)) : Infinity;
                    return Math.max(shiftGrace, minPenaltyMins === Infinity ? 0 : minPenaltyMins - 1);
                })(),
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
