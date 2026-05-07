import Request from "../models/Request.Model.js";
import PenaltyRule from '../models/PenaltyRule.Model.js';
import { calculatePenaltyAmount } from './PenaltyRule.Controller.js';
import User from "../models/User.Model.js";
import Shift from "../models/Shift.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Branch from "../models/Branch.Model.js";
import { computeWorkingMinutes, formatMinutes, getDistance } from "../utils/attendance.js";
import Notification from "../models/Notification.Model.js";

// Notify admin when employee punches in or out
const notifyAdminPunch = async (employeeId, action, date, status) => {
    try {
        const employee = await User.findById(employeeId).select('name employeeId adminId');
        if (!employee?.adminId) return;
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
        const label = action === 'IN' ? 'Punched In' : 'Punched Out';
        const statusNote = status && status !== 'Present' ? ` (${status})` : '';
        await Notification.create({
            user: employee.adminId,
            title: `Employee ${label}`,
            message: `${employee.name} (${employee.employeeId || ''}) ${label.toLowerCase()} at ${timeStr}${statusNote} on ${date}.`,
            type: 'Attendance'
        });
    } catch (e) {
        console.error('notifyAdminPunch error:', e.message);
    }
};

// Helper: get today's date string YYYY-MM-DD in IST
const getTodayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
};

// Helper: parse "HH:MM" or "HH:MM AM/PM" to total minutes since midnight
const parseTimeToMinutes = (t) => {
    if (!t) return null;
    const clean = t.trim();
    const ampm = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampm) {
        let h = parseInt(ampm[1]);
        const m = parseInt(ampm[2]);
        const period = ampm[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    }
    const plain = clean.match(/(\d{1,2}):(\d{2})/);
    if (plain) return parseInt(plain[1]) * 60 + parseInt(plain[2]);
    return null;
};

// Helper: get employee's shift for today (full shift object + today's schedule)
const getEmployeeShiftToday = async (userId) => {
    try {
        const user = await User.findById(userId).populate('workSetup.shift').select('workSetup');
        const shift = user?.workSetup?.shift;
        if (!shift) return { shift: null, daySchedule: null, dayName: null, isWeekOff: false };
        const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
        const dayName = days[istNow.getUTCDay()];
        let daySchedule = shift.schedule?.[dayName] || null;
        const isWeekOff = shift?.weekOffDays?.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1)) || false;

        // If week-off and today's schedule is empty, try to find a fallback from weekdays
        if (isWeekOff && (!daySchedule || !daySchedule.shiftStart)) {
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            for (const day of weekdays) {
                if (shift?.schedule?.[day]?.shiftStart) {
                    daySchedule = shift.schedule[day];
                    break;
                }
            }
        }

        return { shift, daySchedule, dayName, isWeekOff };
    } catch { return { shift: null, daySchedule: null, dayName: null, isWeekOff: false }; }
};

// Helper: get shift duration in minutes for today from employee's assigned shift
const getShiftDurationMinutes = async (userId) => {
    try {
        const { daySchedule } = await getEmployeeShiftToday(userId);
        const start = parseTimeToMinutes(daySchedule?.shiftStart);
        const end = parseTimeToMinutes(daySchedule?.shiftEnd);
        if (start !== null && end !== null) {
            const dur = end > start ? end - start : (end + 1440 - start);
            return dur > 0 ? dur : 480;
        }
        return 480;
    } catch { return 480; }
};


// GET /api/attendance/today
export const getTodayAttendance = async (req, res) => {
    try {
        const date = getTodayStr();
        const record = await Attendance.findOne({ employee: req.user._id, date });
        const shiftDurationMinutes = await getShiftDurationMinutes(req.user._id);

        if (!record) {
            return res.status(200).json({
                success: true,
                record: null,
                status: 'not_started',
                isPunchedIn: false,
                isOnBreak: false,
                workingMinutes: 0,
                workingFormatted: '0h 0m',
                punches: [],
                breaks: [],
                shiftDurationMinutes,
                date
            });
        }

        const lastPunch = record.punches[record.punches.length - 1];
        const isPunchedIn = lastPunch?.type === 'IN';

        const lastBreak = record.breaks?.[record.breaks.length - 1];
        const isOnBreak = !!(lastBreak && !lastBreak.end);
        const currentBreakType = isOnBreak ? lastBreak.type : null;

        const workingMinutes = computeWorkingMinutes(record.punches, record.breaks);

        // Recalculate lateInPenalty live to respect current grace count rules
        // Also handles old records that don't have isLate field yet
        let liveLatePenalty = record.lateInPenalty || { amount: 0, isApplied: false };
        if (record.lateInPenalty?.isLate || (record.lateInPenalty?.amount > 0)) {
            const { shift: empShift, daySchedule: empDaySchedule, isWeekOff } = await getEmployeeShiftToday(req.user._id);
            
            // Skip if it's a week off and settings say don't apply
            if (empShift && empDaySchedule?.shiftStart && !(isWeekOff && !empShift.lateEarlyApplyOnExtraDay)) {
                const firstIn = record.punches.find(p => p.type === 'IN');
                if (firstIn) {
                    const shiftStartMins = parseTimeToMinutes(empDaySchedule.shiftStart);
                    const inTime = new Date(firstIn.time);
                    const istIn = new Date(inTime.getTime() + (5.5 * 60 * 60 * 1000));
                    const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
                    const lateByMins = inMins - shiftStartMins;
                    if (lateByMins > 0) {
                        const recalcAmount = await calculatePenaltyAmount(empShift._id, lateByMins, req.user._id);
                        liveLatePenalty = { amount: recalcAmount, isApplied: recalcAmount > 0, isLate: true };
                        // Patch the stored record if it differs
                        if (recalcAmount !== record.lateInPenalty?.amount) {
                            await Attendance.updateOne(
                                { _id: record._id },
                                { $set: { 'lateInPenalty.amount': recalcAmount, 'lateInPenalty.isApplied': recalcAmount > 0 } }
                            );
                        }
                    }
                }
            } else if (empShift && (isWeekOff && !empShift.lateEarlyApplyOnExtraDay)) {
                // Force penalty to 0 if policy changed after punch-in
                liveLatePenalty = { amount: 0, isApplied: false, isLate: true };
                if (record.lateInPenalty?.amount > 0) {
                     await Attendance.updateOne(
                        { _id: record._id },
                        { $set: { 'lateInPenalty.amount': 0, 'lateInPenalty.isApplied': false } }
                    );
                }
            }
        }

        res.status(200).json({
            success: true,
            record,
            status: record.status,
            isPunchedIn,
            isOnBreak,
            currentBreakType,
            workingMinutes,
            workingFormatted: formatMinutes(workingMinutes),
            lateInPenalty: liveLatePenalty,
            punches: record.punches,
            breaks: record.breaks,
            shiftDurationMinutes,
            date
        });
    } catch (error) {
        console.error("getTodayAttendance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/attendance/toggle-punch
export const togglePunch = async (req, res) => {
    try {
    const { reason, latitude, longitude, geofenceReason, workSummary, earlyReason, lateReason, locationAddress } = req.body;
        const date = getTodayStr();
        const now = new Date();

        // Server-side Geofence Validation
        const emp = await User.findById(req.user._id);
        if (emp?.branch && latitude && longitude) {
            let branch = await Branch.findOne({ branchName: emp.branch, adminId: emp.adminId || emp._id });
            if (!branch) {
                const escaped = emp.branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                branch = await Branch.findOne({ branchName: { $regex: new RegExp(`^${escaped}$`, 'i') }, adminId: emp.adminId || emp._id });
            }
            if (branch && branch.latitude !== 0) {
                const distance = getDistance(latitude, longitude, branch.latitude, branch.longitude);
                const radius = branch.radius || 200;
                const { shift } = await getEmployeeShiftToday(req.user._id);
                if (distance > radius) {
                    if (shift?.requireOutOfRangeReason && !geofenceReason) {
                        return res.status(400).json({ success: false, requireOutOfRangeReason: true, message: "You are out of office range. Please provide a reason." });
                    }
                }
            }
        }

        let record = await Attendance.findOne({ employee: req.user._id, date });

        if (record?.status === 'On Leave') {
            return res.status(400).json({ success: false, message: "You are marked as 'On Leave' for today. Attendance cannot be logged." });
        }

        const lastPunch = record?.punches?.length > 0 ? record.punches[record.punches.length - 1] : null;

        if (!record || !lastPunch) {
            let latePenaltyAmount = 0;
            let lateByMins = 0;
            const { shift, daySchedule } = await getEmployeeShiftToday(req.user._id);
            let punchStatus = 'Present';

            if (shift) {
                const shiftStartMins = parseTimeToMinutes(daySchedule?.shiftStart);
                if (shiftStartMins !== null) {
                    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
                    const nowMins = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
                    const lateByMinsLocal = nowMins - shiftStartMins;
                    lateByMins = lateByMinsLocal;
                    
                    const maxAllowed = shift.maxLateInMinutes || 0;
                    const { isWeekOff } = await getEmployeeShiftToday(req.user._id);

                    // Skip late check on week-off IF policy says so
                    const skipOnExtra = isWeekOff && !shift.lateEarlyApplyOnExtraDay;

                    if (!skipOnExtra && lateByMins > maxAllowed && shift.requireLateReason && !lateReason) {
                        return res.status(400).json({ 
                            success: false, 
                            requireLateReason: true, 
                            message: `You are punching in ${lateByMins}m late. Please provide a reason.` 
                        });
                    }

                    // Check Half-Day penalty
                    const rule = await PenaltyRule.findOne({ shift: shift._id });
                    const skipOnExtraPenalty = isWeekOff && !shift.lateEarlyApplyOnExtraDay;

                    if (!skipOnExtraPenalty) {
                        // AUTOMATIC HALF-DAY RULE: If punch in > shift midpoint
                        const startMins = parseTimeToMinutes(daySchedule?.shiftStart);
                        const endMins = parseTimeToMinutes(daySchedule?.shiftEnd);
                        if (startMins !== null && endMins !== null) {
                            const duration = endMins > startMins ? endMins - startMins : (endMins + 1440 - startMins);
                            const midpointMins = (startMins + (duration / 2)) % 1440;
                            
                            // Check if current time is past midpoint (handling overnight shifts)
                            let isPastMidpoint = false;
                            if (endMins > startMins) {
                                isPastMidpoint = nowMins > midpointMins;
                            } else {
                                // Overnight: midpoint could be before or after midnight
                                if (midpointMins > startMins) isPastMidpoint = nowMins > midpointMins || nowMins < endMins;
                                else isPastMidpoint = nowMins > midpointMins && nowMins < endMins;
                            }

                            if (isPastMidpoint) {
                                punchStatus = 'Half Day';
                            }
                        }

                        // PenaltyRule Slab still takes precedence if specifically configured by admin
                        const halfDaySlab = rule?.slabs?.find(s => s.penaltyType === 'Half-Day' && s.threshold_time);
                        if (halfDaySlab) {
                            const thresholdMins = parseTimeToMinutes(halfDaySlab.threshold_time);
                            if (thresholdMins !== null && nowMins > thresholdMins) {
                                punchStatus = 'Half Day';
                            }
                        }

                        // Only apply monetary late penalty if Half-Day threshold was not triggered
                        if (lateByMins > 0 && punchStatus !== 'Half Day') {
                            latePenaltyAmount = await calculatePenaltyAmount(shift._id, lateByMins, req.user._id);
                        }
                    }
                }
            }

            const newPunch = {
                time: now,
                type: 'IN',
                latitude,
                longitude,
                geofenceReason,
                workSummary,
                lateReason,
                locationAddress
            };

            const lateInPenalty = {
                amount: latePenaltyAmount,
                isApplied: latePenaltyAmount > 0,
                isLate: lateByMins > 0
            };

            if (!record) {
                record = new Attendance({
                    employee: req.user._id,
                    date,
                    punches: [newPunch],
                    status: punchStatus,
                    lateInPenalty
                });
            } else {
                record.punches = [newPunch];
                record.status = punchStatus;
                record.lateInPenalty = lateInPenalty;
                record.approvalStatus = 'Pending'; // Reset if it was On Leave
            }

            await record.save();
            notifyAdminPunch(req.user._id, 'IN', date, record.status);

            return res.status(200).json({
                success: true,
                message: punchStatus === 'Half Day' ? 'Punched In successfully (Half Day)' : 'Punched In successfully',
                action: 'IN',
                time: now,
                isPunchedIn: true,
                isOnBreak: false,
                workingMinutes: 0,
                workingFormatted: '0h 0m',
                lateInPenalty: record.lateInPenalty,
                status: record.status,
                record
            });
        }

        // RULE: If last punch was OUT, they cannot punch in again today.
        if (lastPunch.type === 'OUT') {
            return res.status(400).json({ 
                success: false, 
                message: "You have already completed your punch for today. You cannot punch again until tomorrow." 
            });
        }

        // Action MUST be OUT if record exists (since IN is already the only other state)
        const action = 'OUT';

        // ── Early-out enforcement on PUNCH OUT ──
        const { shift, daySchedule, isWeekOff } = await getEmployeeShiftToday(req.user._id);
        if (shift && daySchedule?.shiftEnd) {
            const shiftEndMins = parseTimeToMinutes(daySchedule.shiftEnd);
            const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const nowMins = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
            const earlyByMins = shiftEndMins - nowMins;
            console.log(`[PENALTY_DEBUG] Punch Out at ${istNow.getUTCHours()}:${istNow.getUTCMinutes()} IST. Shift End: ${shiftEndMins}m, Early: ${earlyByMins}m`);

            if (earlyByMins > 0) {
                const providedReason = req.body.earlyReason || req.body.reason;
                let maxAllowed = shift.maxEarlyOutMinutes ?? 0;
                
                // If Combined, maxAllowed is (maxLateInMinutes - lateMins)
                if (shift.lateEarlyType === 'Combined') {
                    const firstIn = record.punches.find(p => p.type === 'IN');
                    const shiftStartMins = parseTimeToMinutes(daySchedule?.shiftStart);
                    if (firstIn && shiftStartMins !== null) {
                        const inTime = new Date(firstIn.time);
                        const inMinsTotal = inTime.getHours() * 60 + inTime.getMinutes();
                        const lateMins = Math.max(0, inMinsTotal - shiftStartMins);
                        maxAllowed = Math.max(0, (shift.maxLateInMinutes || 0) - lateMins);
                        console.log(`[PENALTY_DEBUG] Combined late/early. First IN: ${inMinsTotal}m, Shift Start: ${shiftStartMins}m, Late: ${lateMins}m. Adjusted maxEarlyOut: ${maxAllowed}m`);
                    } else {
                        maxAllowed = shift.maxLateInMinutes || 0;
                        console.log(`[PENALTY_DEBUG] Combined late/early. No first IN or shift start. Defaulting maxEarlyOut: ${maxAllowed}m`);
                    }
                }

                const skipOnExtraEarlyReason = isWeekOff && !shift.lateEarlyApplyOnExtraDay;
                if (!skipOnExtraEarlyReason && earlyByMins > maxAllowed && shift.requireEarlyOutReason && !providedReason) {
                    return res.status(400).json({
                        success: false,
                        earlyOut: true,
                        earlyByMins,
                        requireReason: true,
                        message: `You were late ${shift.maxLateInMinutes - maxAllowed}m this morning. You can only leave ${maxAllowed}m early. Please provide a reason.`
                    });
                }

                // Check Half-Day penalty on Punch Out
                const rule = await PenaltyRule.findOne({ shift: shift._id });
                const skipOnExtraPenaltyOut = isWeekOff && !shift.lateEarlyApplyOnExtraDay;

                if (!skipOnExtraPenaltyOut) {
                    // AUTOMATIC HALF-DAY RULE (Punch Out): If punch out < shift midpoint
                    const startMins = parseTimeToMinutes(daySchedule?.shiftStart);
                    const endMins = parseTimeToMinutes(daySchedule?.shiftEnd);
                    if (startMins !== null && endMins !== null) {
                        const duration = endMins > startMins ? endMins - startMins : (endMins + 1440 - startMins);
                        const midpointMins = (startMins + (duration / 2)) % 1440;
                        
                        let isBeforeMidpoint = false;
                        if (endMins > startMins) {
                            isBeforeMidpoint = nowMins < midpointMins;
                        } else {
                            if (midpointMins > startMins) isBeforeMidpoint = nowMins < midpointMins && nowMins > startMins;
                            else isBeforeMidpoint = nowMins < midpointMins || nowMins > startMins;
                        }

                        if (isBeforeMidpoint) {
                            record.status = 'Half Day';
                        }
                    }

                    const halfDaySlab = rule?.slabs?.find(s => s.penaltyType === 'Half-Day' && s.threshold_time);
                    if (halfDaySlab) {
                        const thresholdMins = parseTimeToMinutes(halfDaySlab.threshold_time);
                        if (thresholdMins !== null && nowMins < thresholdMins) {
                            record.status = 'Half Day';
                            console.log(`[PENALTY_DEBUG] Mark as Half Day (Early Out). Today: ${nowMins}m, Threshold: ${thresholdMins}m`);
                        }
                    }

                    // Calculate early out penalty if applicable
                    const earlyOutPenaltyAmount = await calculatePenaltyAmount(shift._id, earlyByMins, null, rule, null, 'Early Out Minutes');
                    if (earlyOutPenaltyAmount > 0) {
                        record.earlyOutPenalty = {
                            amount: earlyOutPenaltyAmount,
                            isApplied: true
                        };
                        console.log(`[PENALTY_DEBUG] Calculated early out penalty: ${earlyOutPenaltyAmount} for ${earlyByMins}m early.`);
                    }
                }
            }
        }

        // Close any open break
        const lastBreak = record.breaks[record.breaks.length - 1];
        if (lastBreak && !lastBreak.end) lastBreak.end = now;

        record.punches.push({
            time: now,
            type: 'OUT',
            latitude,
            longitude,
            geofenceReason,
            workSummary,
            earlyReason: earlyReason || reason,
            locationAddress
        });
        await record.save();
        notifyAdminPunch(req.user._id, 'OUT', date, record.status);

        const workingMinutes = computeWorkingMinutes(record.punches, record.breaks);

        res.status(200).json({
            success: true,
            message: `Punched ${action} successfully`,
            action,
            time: now,
            isPunchedIn: action === 'IN',
            isOnBreak: false,
            workingMinutes,
            workingFormatted: formatMinutes(workingMinutes),
            lateInPenalty: record.lateInPenalty || { amount: 0, isApplied: false },
            record
        });
    } catch (error) {
        console.error("togglePunch error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/attendance/toggle-break
export const toggleBreak = async (req, res) => {
    try {
        const { breakType = 'General' } = req.body;
        const date = getTodayStr();
        const now = new Date();

        const record = await Attendance.findOne({ employee: req.user._id, date });
        if (!record) return res.status(400).json({ success: false, message: "No attendance record for today" });

        const lastPunch = record.punches[record.punches.length - 1];
        if (lastPunch?.type !== 'IN') return res.status(400).json({ success: false, message: "You must be punched in to take a break" });

        const lastBreak = record.breaks[record.breaks.length - 1];
        const isOnBreak = lastBreak && !lastBreak.end;

        if (isOnBreak) {
            lastBreak.end = now;
            await record.save();
            return res.status(200).json({ success: true, message: "Break ended", isOnBreak: false, record });
        } else {
            // -- Defined Minutes Enforcement --
            const { shift, daySchedule } = await getEmployeeShiftToday(req.user._id);
            if (shift && shift.breakMode === 'Defined Minutes') {
                const typeLower = breakType.toLowerCase();
                let startStr = '', endStr = '';

                if (typeLower.includes('lunch')) {
                    startStr = daySchedule?.lunchStart;
                    endStr = daySchedule?.lunchEnd;
                } else if (typeLower.includes('tea')) {
                    startStr = daySchedule?.teaStart;
                    endStr = daySchedule?.teaEnd;
                }

                if (startStr && endStr) {
                    const nowMins = now.getHours() * 60 + now.getMinutes();
                    const startMins = parseTimeToMinutes(startStr);
                    const endMins = parseTimeToMinutes(endStr);
                    
                    if (nowMins < startMins || nowMins > endMins) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `You can only take ${breakType} between ${startStr} and ${endStr}` 
                        });
                    }
                } else if (typeLower.includes('lunch') || typeLower.includes('tea')) {
                    // It's a standard break but NO range is set in the shift
                   return res.status(400).json({ 
                        success: false, 
                        message: `No time range defined for ${breakType} in your shift configuration.` 
                    });
                }
                // For other breaks (like Personal), we allow them if not explicitly scheduled 
                // OR we could block them too. User said "apply rule for other", so likely block?
                // Let's stick to Lunch/Tea for now as they are the only ones with fields.
            }

            record.breaks.push({ start: now, type: breakType });
            await record.save();
            return res.status(200).json({ success: true, message: "Break started", isOnBreak: true, record });
        }
    } catch (error) {
        console.error("toggleBreak error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/history?month=YYYY-MM
export const getAttendanceHistory = async (req, res) => {
    try {
        const { month } = req.query; // e.g. "2026-03"
        const employeeId = req.user._id;

        let filter = { employee: employeeId };
        if (month) {
            filter.date = { $regex: `^${month}` };
        }

        const records = await Attendance.find(filter).sort({ date: -1 });
        
        // Fetch user's shift and leaveGroup
        const user = await User.findById(req.user._id).populate('workSetup.shift').populate('leaveGroup');
        const weekOffDays = user?.workSetup?.shift?.weekOffDays || [];
        const leavePolicy = user?.leaveGroup?.leaveBalanceVisibility || 'Default (Multiple of 0.5)';

        // Also fetch requests for this month to show "Request already sent"
        const requests = await Request.find(filter).populate('leaveType', 'name').sort({ date: -1 });
        const todayStr = getTodayStr();
        const rqMap = {};
        requests.forEach(rq => {
            // Hide 'Attendance Correction' requests for the current day
            if (rq.requestType === 'Attendance Correction' && rq.date === todayStr) return;

            rqMap[rq.date] = {
                id: rq._id,
                type: rq.requestType,
                status: rq.status,
                reason: rq.reason,
                leaveType: rq.leaveType?.name,
                appliedAt: rq.appliedAt,
                manualIn: rq.manualIn,
                manualOut: rq.manualOut
            };
        });

        const formatted = records.map(r => {
            const workingMinutes = computeWorkingMinutes(r.punches, r.breaks);
            
            // Total break time
            let totalBreakMs = 0;
            (r.breaks || []).forEach(b => {
                if (b.start && b.end) totalBreakMs += new Date(b.end) - new Date(b.start);
            });
            const breakMinutes = Math.round(totalBreakMs / 60000);

            const firstIn = r.punches.find(p => p.type === 'IN');
            const lastOut = [...r.punches].reverse().find(p => p.type === 'OUT');
            
            let status = r.status || "Present";
            if (firstIn && !lastOut && r.status !== 'On Leave') {
                status = (r.date === todayStr) ? 'Clocked In' : 'Incomplete';
            }

            return {
                date: r.date,
                status,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                workingMinutes,
                workingFormatted: formatMinutes(workingMinutes),
                breakCount: r.breaks.length,
                breakFormatted: formatMinutes(breakMinutes),
                punches: r.punches,
                breaks: r.breaks,
                lateInPenalty: r.lateInPenalty || { amount: 0, isApplied: false },
                earlyOutPenalty: r.earlyOutPenalty || { amount: 0, isApplied: false },
                approvalStatus: r.approvalStatus || "Pending",
                request: rqMap[r.date] || null
            };
        });

        const totalPenalty = records.reduce((acc, r) => acc + (r.lateInPenalty?.amount || 0), 0);

        res.status(200).json({ 
            success: true, 
            records: formatted, 
            requests: rqMap,
            totalPenalty,
            weekOffDays,
            leavePolicy,
            joiningDate: req.user?.dateJoined ? new Date(req.user.dateJoined).toISOString().split('T')[0] : null 
        });
    } catch (error) {
        console.error("getAttendanceHistory error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/admin/all?date=YYYY-MM-DD  (admin only)
export const getAdminAttendance = async (req, res) => {
    try {
        const { date, month, approvalStatus } = req.query;
        let filter = {};
        if (date) filter.date = date;
        else if (month) filter.date = { $regex: `^${month}` };
        
        if (approvalStatus) filter.approvalStatus = approvalStatus;

        const records = await Attendance.find(filter)
            .populate({
                path: 'employee',
                select: 'name employeeId department designation profilePhoto workSetup',
                populate: { path: 'workSetup.shift', select: 'weekOffDays' }
            })
            .sort({ date: -1 });

        const formatted = records.map(r => {
            const workingMinutes = computeWorkingMinutes(r.punches, r.breaks);
            const firstIn = r.punches.find(p => p.type === 'IN');
            const lastOut = [...r.punches].reverse().find(p => p.type === 'OUT');
            
            // Check if Extra Day (Worked on Week Off)
            let isExtraDay = false;
            if (r.employee?.workSetup?.shift?.weekOffDays?.length > 0) {
                const dateObj = new Date(r.date);
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = days[dateObj.getUTCDay()];
                isExtraDay = r.employee.workSetup.shift.weekOffDays.includes(dayName);
            }

            return {
                _id: r._id,
                date: r.date,
                status: r.status,
                employee: r.employee,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                workingMinutes,
                workingFormatted: formatMinutes(workingMinutes),
                breakCount: r.breaks.length,
                isPunchedIn: r.punches[r.punches.length - 1]?.type === 'IN',
                punches: r.punches,
                breaks: r.breaks,
                approvalStatus: r.approvalStatus || "Pending",
                isExtraDay
            };
        });

        res.status(200).json({ success: true, records: formatted, date: date || getTodayStr() });
    } catch (error) {
        console.error("getAdminAttendance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/attendance/admin/approve (admin only)
export const updateApprovalStatus = async (req, res) => {
    try {
        const { attendanceId, status } = req.body;
        if (!["Approved", "Rejected", "Pending"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const record = await Attendance.findById(attendanceId);
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        record.approvalStatus = status;
        await record.save();

        // Create In-App Notification
        await Notification.create({
            user: record.employee,
            title: `Attendance ${status}`,
            message: `Your attendance log for ${record.date} has been ${status.toLowerCase()} by an admin.`,
            type: "Attendance"
        });

        res.status(200).json({ success: true, message: `Attendance ${status} successfully`, record });
    } catch (error) {
        console.error("updateApprovalStatus error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// DELETE /api/attendance/admin/delete (admin only)
export const deleteAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.body;
        if (!attendanceId) return res.status(400).json({ success: false, message: "Attendance ID is required" });

        const record = await Attendance.findById(attendanceId);
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        // Update to Absent instead of deleting
        record.status = "Absent";
        record.punches = [];
        record.breaks = [];
        record.lateInPenalty = { amount: 0, isApplied: false, isLate: false };
        record.earlyOutPenalty = { amount: 0, isApplied: false };
        record.approvalStatus = "Approved"; // Mark as final
        record.remark = "Marked as Absent by Admin";
        
        await record.save();

        // Also delete any pending 'Attendance Correction' requests for this date
        await Request.deleteMany({
            employee: record.employee,
            date: record.date,
            requestType: 'Attendance Correction'
        });

        // Notify employee about marking absent
        await Notification.create({
            user: record.employee,
            title: "Attendance Updated: Absent",
            message: `Admin has updated your attendance for ${record.date} to 'Absent'.`,
            type: "Attendance"
        });

        res.status(200).json({ success: true, message: "Attendance record marked as Absent successfully" });
    } catch (error) {
        console.error("deleteAttendance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/attendance/admin/add-manual (admin only)
export const addManualAttendance = async (req, res) => {
    try {
        const { employeeId, date, status, inTime, outTime, remark } = req.body;
        
        if (!employeeId || !date || !status) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Prepare punches
        let punches = [];
        if (inTime) {
            punches.push({ time: new Date(`${date}T${inTime}:00`), type: "IN", locationAddress: "Admin Manual Entry" });
        }
        if (outTime) {
            punches.push({ time: new Date(`${date}T${outTime}:00`), type: "OUT", locationAddress: "Admin Manual Entry" });
        }

        const record = await Attendance.findOneAndUpdate(
            { employee: employeeId, date },
            {
                $set: {
                    status,
                    approvalStatus: "Approved",
                    punches,
                    remark: remark || "Added by Admin"
                }
            },
            { upsert: true, new: true }
        );

        // Notify employee
        await Notification.create({
            user: employeeId,
            title: "Attendance Updated",
            message: `Admin has updated your attendance for ${date} as ${status}.`,
            type: "Attendance"
        });

        res.status(200).json({ success: true, message: "Attendance updated successfully", record });
    } catch (error) {
        console.error("addManualAttendance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/admin/missing (admin only)
export const getMissingAttendance = async (req, res) => {
    try {
        const { date, month } = req.query;
        let query = {};
        if (date) query.date = date;
        else if (month) query.date = { $regex: `^${month}` };

        const records = await Attendance.find(query)
            .populate('employee', 'name employeeId department designation profilePhoto')
            .sort({ date: -1 });

        // Filter for "missing" attendance logic:
        // 1. Absent
        // 2. Rejected
        // 3. Punched IN but never Punched OUT (Missing punch out)
        const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = istNow.toISOString().split('T')[0];

        const missingRecords = records.filter(r => {
            if (r.status === "Absent" || r.approvalStatus === "Rejected") return true;
            
            const hasIn = r.punches.some(p => p.type === 'IN');
            const hasOut = r.punches.some(p => p.type === 'OUT');
            
            if (hasIn && !hasOut && r.date !== todayStr) {
                return true;
            }
            return false;
        });

        const formatted = missingRecords.map(r => {
            const firstIn = r.punches.find(p => p.type === 'IN');
            const lastOut = [...r.punches].reverse().find(p => p.type === 'OUT');
            
            let missingReason = r.status;
            if (r.approvalStatus === 'Rejected') missingReason = 'Rejected';
            else if (r.punches.some(p => p.type === 'IN') && !r.punches.some(p => p.type === 'OUT')) missingReason = 'Missing Punch Out';

            return {
                _id: r._id,
                date: r.date,
                status: r.status,
                missingReason,
                employee: r.employee,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                approvalStatus: r.approvalStatus || "Pending"
            };
        });

        res.status(200).json({ success: true, records: formatted });
    } catch (error) {
        console.error("getMissingAttendance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/admin/absent-list?date=YYYY-MM-DD (admin only)
export const getAbsentEmployees = async (req, res) => {
    try {
        const { date = getTodayStr() } = req.query;

        // 1. Get all attendance records for this date
        const presentRecords = await Attendance.find({ date }).select('employee status');
        const presentEmployeeIds = presentRecords.map(r => r.employee.toString());

        // 2. Get all active employees
        const employees = await User.find({ 
            role: 'Employee', 
            status: 'Active' 
        })
        .select('name employeeId department designation profilePhoto workSetup phone branch')
        .populate('workSetup.shift', 'weekOffDays');

        // 3. Identify who is NOT present
        const absentees = employees.filter(emp => !presentEmployeeIds.includes(emp._id.toString()));

        // 4. Categorize by shift/week-off
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dateObj = new Date(date);
        const dayName = days[dateObj.getUTCDay()];

        const formatted = absentees.map(emp => {
            const weekOffDays = emp.workSetup?.shift?.weekOffDays || [];
            const isWeekOff = weekOffDays.includes(dayName);
            
            return {
                _id: emp._id,
                name: emp.name,
                employeeId: emp.employeeId,
                department: emp.department,
                designation: emp.designation,
                profilePhoto: emp.profilePhoto,
                phone: emp.phone,
                branch: emp.branch,
                isWeekOff,
                shiftName: emp.workSetup?.shift?.name || 'Not Assigned'
            };
        });

        res.status(200).json({ 
            success: true, 
            absentees: formatted,
            date,
            dayName,
            totalActive: employees.length,
            presentCount: presentEmployeeIds.length
        });
    } catch (error) {
        console.error("getAbsentEmployees error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/admin/monthly-stats?month=YYYY-MM&employeeId=...
export const getMonthlyAttendanceStats = async (req, res) => {
    try {
        const { month, employeeId } = req.query;
        if (!month || !employeeId) {
            return res.status(400).json({ success: false, message: "Month and EmployeeId are required" });
        }

        const user = await User.findById(employeeId).populate('workSetup.shift');
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const shift = user.workSetup?.shift;
        const weekOffDays = shift?.weekOffDays || [];

        const records = await Attendance.find({
            employee: employeeId,
            date: { $regex: `^${month}` }
        });

        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        let workingDaysCount = 0;
        let weekOffCount = 0;
        let totalExpectedMins = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, monthNum - 1, d);
            const dayName = days[dateObj.getDay()];
            const isWeekOff = weekOffDays.includes(dayName);
            
            if (isWeekOff) {
                weekOffCount++;
            } else {
                workingDaysCount++;
                const schedule = shift?.schedule?.[dayName.toLowerCase()];
                if (schedule) {
                    const start = parseTimeToMinutes(schedule.shiftStart);
                    const end = parseTimeToMinutes(schedule.shiftEnd);
                    if (start !== null && end !== null) {
                        const dur = end > start ? end - start : (end + 1440 - start);
                        totalExpectedMins += dur;
                    } else {
                        totalExpectedMins += 480; 
                    }
                } else {
                    totalExpectedMins += 480;
                }
            }
        }

        const presentDays = records.filter(r => r.status === 'Present').length;
        const halfDays = records.filter(r => r.status === 'Half Day').length;
        const absentDays = records.filter(r => r.status === 'Absent').length;
        const leaveDays = records.filter(r => r.status === 'On Leave').length;
        const totalWorkedMins = records.reduce((acc, r) => acc + (computeWorkingMinutes(r.punches, r.breaks) || 0), 0);
        
        const stats = {
            workingDays: workingDaysCount,
            presentDays: presentDays + (halfDays * 0.5),
            absentDays,
            weekOff: weekOffCount,
            leaves: leaveDays,
            lateIn: records.filter(r => r.lateInPenalty?.isLate).length,
            earlyOut: records.filter(r => r.earlyOutPenalty?.amount > 0).length,
            missingPunch: records.filter(r => r.punches.find(p => p.type === 'IN') && !r.punches.find(p => p.type === 'OUT')).length,
            totalExpectedHours: Math.round(totalExpectedMins / 60),
            totalWorkedHours: Math.floor(totalWorkedMins / 60),
            totalWorkedMins: totalWorkedMins % 60,
            efficiency: Math.round((totalWorkedMins / (totalExpectedMins || 1)) * 100) || 0,
            totalExpectedMins
        };

        const formattedRecords = records.map(r => {
            const firstIn = r.punches.find(p => p.type === 'IN');
            const lastOut = [...r.punches].reverse().find(p => p.type === 'OUT');
            const workingMins = computeWorkingMinutes(r.punches, r.breaks);

            return {
                date: r.date,
                status: r.status,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                workingFormatted: formatMinutes(workingMins),
                approvalStatus: r.approvalStatus || 'Pending'
            };
        });

        res.status(200).json({ 
            success: true, 
            stats, 
            records: formattedRecords,
            weekOffDays 
        });
    } catch (error) {
        console.error("getMonthlyAttendanceStats error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

