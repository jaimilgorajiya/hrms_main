import Request from "../models/Request.Model.js";
import PenaltyRule from '../models/PenaltyRule.Model.js';
import { calculatePenaltyAmount } from './PenaltyRule.Controller.js';
import User from "../models/User.Model.js";
import Shift from "../models/Shift.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Branch from "../models/Branch.Model.js";
import { computeWorkingMinutes, formatMinutes, getDistance } from "../utils/attendance.js";
import Notification from "../models/Notification.Model.js";
import { isMonthLocked } from '../utils/payoutLock.js';

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
export const getEmployeeShiftToday = async (userId, targetDate = null) => {
    try {
        const user = await User.findById(userId).populate('workSetup.shift').select('workSetup');
        const shift = user?.workSetup?.shift;
        if (!shift) return { shift: null, daySchedule: null, dayName: null, isWeekOff: false };
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        let dateObj;
        if (targetDate) {
            if (typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                // Parse date string (e.g., '2026-06-09') as UTC to avoid local timezone offset shifting the day
                dateObj = new Date(`${targetDate}T00:00:00Z`);
            } else {
                const tDate = new Date(targetDate);
                // Convert to IST offset
                dateObj = new Date(tDate.getTime() + (5.5 * 60 * 60 * 1000));
            }
        } else {
            const now = new Date();
            dateObj = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        }

        const dayName = days[dateObj.getUTCDay()];
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
export const getShiftDurationMinutes = async (userId, targetDate = null) => {
    try {
        const { daySchedule } = await getEmployeeShiftToday(userId, targetDate);
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
        const shiftDurationMinutes = await getShiftDurationMinutes(req.user._id, date);

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
            const { shift: empShift, daySchedule: empDaySchedule, isWeekOff } = await getEmployeeShiftToday(req.user._id, record.date);

            // Skip if it's a week off and settings say don't apply
            if (empShift && empDaySchedule?.shiftStart && !(isWeekOff && !empShift.lateEarlyApplyOnExtraDay)) {
                const firstIn = record.punches.find(p => p.type === 'IN');
                if (firstIn) {
                    const shiftStartMins = parseTimeToMinutes(empDaySchedule.shiftStart);
                    const inTime = new Date(firstIn.time);
                    const istIn = new Date(inTime.getTime() + (5.5 * 60 * 60 * 1000));
                    const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
                    const lateByMins = inMins - shiftStartMins;
                    const graceMins = empShift.maxLateInMinutes || 0;
                    if (lateByMins > graceMins) {
                        const recalcAmount = await calculatePenaltyAmount(empShift._id, lateByMins, req.user._id);
                        liveLatePenalty = { amount: recalcAmount, isApplied: recalcAmount > 0, isLate: true };
                        // Patch the stored record if it differs
                        if (recalcAmount !== record.lateInPenalty?.amount || !record.lateInPenalty?.isLate) {
                            await Attendance.updateOne(
                                { _id: record._id },
                                { $set: { 'lateInPenalty.amount': recalcAmount, 'lateInPenalty.isApplied': recalcAmount > 0, 'lateInPenalty.isLate': true } }
                            );
                        }
                    } else {
                        liveLatePenalty = { amount: 0, isApplied: false, isLate: false };
                        if (record.lateInPenalty?.isLate || (record.lateInPenalty?.amount > 0)) {
                            await Attendance.updateOne(
                                { _id: record._id },
                                { $set: { 'lateInPenalty.amount': 0, 'lateInPenalty.isApplied': false, 'lateInPenalty.isLate': false } }
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
            earlyOutPenalty: record.earlyOutPenalty || { amount: 0, isApplied: false },
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
        const { reason, latitude, longitude, geofenceReason, workSummary, earlyReason, lateReason, locationAddress, isMocked, mocked, clientTime, isOfflineSync } = req.body;
        
        // Anti-GPS Spoofing Check
        if (isMocked || mocked) {
            return res.status(400).json({ 
                success: false, 
                message: "GPS spoofing or mock location detected. Attendance logging blocked." 
            });
        }

        // Anti-Clock Tampering Check
        // Offline syncs are exempt from the 60-second drift rule (they are intentionally delayed).
        // For offline syncs: only reject if clientTime is in the FUTURE (impossible for a real punch).
        // For online punches: reject if drift > 60 seconds (original rule).
        if (clientTime) {
            const clientEpoch = new Date(clientTime).getTime();
            const serverEpoch = Date.now();
            if (isOfflineSync) {
                // Offline sync: clientTime must not be in the future
                if (clientEpoch > serverEpoch + 60000) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Invalid punch time: punch time is in the future." 
                    });
                }
            } else {
                // Online punch: must be within 60 seconds of server time
                const diffSeconds = Math.abs(clientEpoch - serverEpoch) / 1000;
                if (diffSeconds > 60) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Clock tampering detected. Please synchronize your device clock with network time." 
                    });
                }
            }
        }

        const date = isOfflineSync && clientTime
            ? new Date(clientTime).toISOString().slice(0, 10)  // Use the real punch date for offline syncs
            : getTodayStr();
        const now = isOfflineSync && clientTime ? new Date(clientTime) : new Date();

        if (await isMonthLocked(req.user._id, date)) {
            return res.status(400).json({ success: false, message: "Attendance for this month has been locked/published and cannot be modified." });
        }

        // Server-side Geofence Validation
        const emp = await User.findById(req.user._id);
        if (emp?.branch) {
            let branch = await Branch.findOne({ branchName: emp.branch, adminId: emp.adminId || emp._id });
            if (!branch) {
                const escaped = emp.branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                branch = await Branch.findOne({ branchName: { $regex: new RegExp(`^${escaped}$`, 'i') }, adminId: emp.adminId || emp._id });
            }
            if (branch && branch.latitude !== 0) {
                if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
                    return res.status(400).json({ success: false, message: "Location coordinates are required to verify geofence boundaries." });
                }
                const distance = getDistance(latitude, longitude, branch.latitude, branch.longitude);
                const radius = branch.radius || 200;
                const { shift } = await getEmployeeShiftToday(req.user._id, date);
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
            const { shift, daySchedule } = await getEmployeeShiftToday(req.user._id, date);
            let punchStatus = 'Present';

            if (shift) {
                const shiftStartMins = parseTimeToMinutes(daySchedule?.shiftStart);
                if (shiftStartMins !== null) {
                    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
                    const nowMins = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
                    const lateByMinsLocal = nowMins - shiftStartMins;
                    lateByMins = lateByMinsLocal;

                    const { isWeekOff } = await getEmployeeShiftToday(req.user._id, date);
                    const skipOnExtra = isWeekOff && !shift.lateEarlyApplyOnExtraDay;

                    // Calculate effective max allowed based on Shift + Penalty Rules
                    let maxAllowed = shift.maxLateInMinutes || 0;
                    const penaltyRule = await PenaltyRule.findOne({ shift: shift._id });
                    const lateSlabs = penaltyRule?.slabs?.filter(s => s.penaltyType === 'Late In Minutes') || [];
                    if (lateSlabs.length > 0) {
                        const minPenaltyMins = Math.min(...lateSlabs.map(s => s.minTime || 0));
                        maxAllowed = Math.max(maxAllowed, minPenaltyMins === Infinity ? 0 : minPenaltyMins - 1);
                    }

                    if (!skipOnExtra && lateByMins > maxAllowed && shift.requireLateReason && !lateReason) {
                        return res.status(400).json({
                            success: false,
                            requireLateReason: true,
                            message: `You are punching in ${lateByMins}m late. Please provide a reason.`
                        });
                    }

                    // Check Half-Day penalty
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
                        const halfDaySlab = penaltyRule?.slabs?.find(s => s.penaltyType === 'Half-Day' && s.threshold_time);
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
                locationAddress,
                ...(isOfflineSync ? { syncedOffline: true, syncedAt: new Date() } : {})
            };

            const lateInPenalty = {
                amount: latePenaltyAmount,
                isApplied: latePenaltyAmount > 0,
                isLate: lateByMins > (shift.maxLateInMinutes || 0)
            };

            if (!record) {
                record = new Attendance({
                    employee: req.user._id,
                    adminId: emp.adminId || emp._id,
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

            // Auto-activate employee on first successful punch in
            if (emp && emp.status === 'Onboarding') {
                emp.status = 'Active';
                await emp.save();
                try {
                    const Onboarding = (await import('../models/Onboarding.Model.js')).default;
                    await Onboarding.findOneAndUpdate(
                        { userId: emp._id },
                        { status: 'Completed' },
                        { upsert: true }
                    );
                } catch (onboardingErr) {
                    console.error("Failed to update onboarding status on punch in:", onboardingErr);
                }
            }

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
        const { shift, daySchedule, isWeekOff } = await getEmployeeShiftToday(req.user._id, date);
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
                        const istIn = new Date(inTime.getTime() + (5.5 * 60 * 60 * 1000));
                        const inMinsTotal = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
                        const lateMins = Math.max(0, inMinsTotal - shiftStartMins);
                        maxAllowed = Math.max(0, (shift.maxLateInMinutes || 0) - lateMins);
                        console.log(`[PENALTY_DEBUG] Combined late/early. First IN: ${inMinsTotal}m, Shift Start: ${shiftStartMins}m, Late: ${lateMins}m. Adjusted maxEarlyOut: ${maxAllowed}m`);
                    } else {
                        maxAllowed = shift.maxLateInMinutes || 0;
                        console.log(`[PENALTY_DEBUG] Combined late/early. No first IN or shift start. Defaulting maxEarlyOut: ${maxAllowed}m`);
                    }
                }

                // Apply Penalty Rule min threshold if applicable
                const penaltyRule = await PenaltyRule.findOne({ shift: shift._id });
                const earlySlabs = penaltyRule?.slabs?.filter(s => s.penaltyType === 'Early Out Minutes') || [];
                if (earlySlabs.length > 0) {
                    const minPenaltyMins = Math.min(...earlySlabs.map(s => s.minTime || 0));
                    maxAllowed = Math.max(maxAllowed, minPenaltyMins === Infinity ? 0 : minPenaltyMins - 1);
                }

                const skipOnExtraEarlyReason = isWeekOff && !shift.lateEarlyApplyOnExtraDay;
                if (!skipOnExtraEarlyReason && earlyByMins > maxAllowed && shift.requireEarlyOutReason && !providedReason) {
                    return res.status(400).json({
                        success: false,
                        earlyOut: true,
                        earlyByMins,
                        requireReason: true,
                        message: `You are punching out ${earlyByMins}m early. Please provide a reason.`
                    });
                }

                // Check Half-Day penalty on Punch Out
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

                    const halfDaySlab = penaltyRule?.slabs?.find(s => s.penaltyType === 'Half-Day' && s.threshold_time);
                    if (halfDaySlab) {
                        const thresholdMins = parseTimeToMinutes(halfDaySlab.threshold_time);
                        if (thresholdMins !== null && nowMins < thresholdMins) {
                            record.status = 'Half Day';
                            console.log(`[PENALTY_DEBUG] Mark as Half Day (Early Out). Today: ${nowMins}m, Threshold: ${thresholdMins}m`);
                        }
                    }

                    // Calculate early out penalty if applicable
                    const earlyOutPenaltyAmount = await calculatePenaltyAmount(shift._id, earlyByMins, null, penaltyRule, null, 'Early Out Minutes');
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
            locationAddress,
            ...(isOfflineSync ? { syncedOffline: true, syncedAt: new Date() } : {})
        });

        const workingMinutes = computeWorkingMinutes(record.punches, record.breaks);

        // ── Derive thresholds from the actual day's shift schedule ──────────────────
        // Priority 1: Admin explicitly set minFullDayHours / minHalfHours on the schedule
        // Priority 2: Compute from shiftStart/shiftEnd/lunchStart/lunchEnd (handles
        //             days like Saturday that have a shorter shift than normal days)
        let minFullDayMins = 8 * 60; // safe fallback
        let minHalfDayMins = 4 * 60;

        if (daySchedule) {
            if (daySchedule.minFullDayHours > 0) {
                // Admin has explicitly configured these – respect them as-is
                minFullDayMins = daySchedule.minFullDayHours * 60;
                if (daySchedule.minHalfHours > 0) minHalfDayMins = daySchedule.minHalfHours * 60;
                else minHalfDayMins = Math.floor(minFullDayMins / 2);
            } else if (daySchedule.shiftStart && daySchedule.shiftEnd) {
                // Auto-derive from the shift times for this specific day
                const startM = parseTimeToMinutes(daySchedule.shiftStart);
                const endM   = parseTimeToMinutes(daySchedule.shiftEnd);
                if (startM !== null && endM !== null) {
                    // Total shift span (handle overnight shifts)
                    const shiftSpan = endM > startM ? endM - startM : (endM + 1440 - startM);

                    // Deduct scheduled lunch break if it falls within this shift
                    let lunchMins = 0;
                    if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                        const lsM = parseTimeToMinutes(daySchedule.lunchStart);
                        const leM = parseTimeToMinutes(daySchedule.lunchEnd);
                        if (lsM !== null && leM !== null && leM > lsM) {
                            lunchMins = leM - lsM;
                        }
                    }

                    const effectiveShiftMins = Math.max(shiftSpan - lunchMins, 1);
                    minFullDayMins = effectiveShiftMins;          // e.g. Saturday → 330 min
                    minHalfDayMins = Math.floor(effectiveShiftMins / 2); // 50% of day's own shift
                }
            }
        }

        let finalStatus = 'Present';
        if (workingMinutes < minHalfDayMins) {
            finalStatus = 'Absent';
        } else if (workingMinutes < minFullDayMins) {
            finalStatus = 'Half Day';
        }

        // Keep the stricter status (never upgrade from Absent -> Half Day/Present, or Half Day -> Present)
        const statusPriority = { 'Absent': 1, 'Half Day': 2, 'Present': 3 };
        const oldStatus = record.status || 'Present';
        if (statusPriority[oldStatus] && statusPriority[oldStatus] < statusPriority[finalStatus]) {
            finalStatus = oldStatus;
        }
        record.status = finalStatus;

        await record.save();
        notifyAdminPunch(req.user._id, 'OUT', date, record.status);

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

        if (await isMonthLocked(req.user._id, date)) {
            return res.status(400).json({ success: false, message: "Attendance for this month has been locked/published and cannot be modified." });
        }

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
            let finalBreakType = breakType;
            const { shift, daySchedule } = await getEmployeeShiftToday(req.user._id, date);
            if (shift && shift.breakMode === 'Defined Minutes') {
                const nowMins = now.getHours() * 60 + now.getMinutes();
                const lunchStartMins = daySchedule?.lunchStart ? parseTimeToMinutes(daySchedule.lunchStart) : null;
                const lunchEndMins = daySchedule?.lunchEnd ? parseTimeToMinutes(daySchedule.lunchEnd) : null;
                const teaStartMins = daySchedule?.teaStart ? parseTimeToMinutes(daySchedule.teaStart) : null;
                const teaEndMins = daySchedule?.teaEnd ? parseTimeToMinutes(daySchedule.teaEnd) : null;

                let allowed = false;
                const typeLower = breakType.toLowerCase();
                const isLunchRequest = typeLower.includes('lunch');
                const isTeaRequest = typeLower.includes('tea');
                const isGeneralRequest = !isLunchRequest && !isTeaRequest;

                if (isLunchRequest || isGeneralRequest) {
                    if (lunchStartMins !== null && lunchEndMins !== null) {
                        if (nowMins >= lunchStartMins && nowMins <= lunchEndMins) {
                            allowed = true;
                            finalBreakType = 'Lunch';
                        }
                    }
                }

                if (!allowed && (isTeaRequest || isGeneralRequest)) {
                    if (teaStartMins !== null && teaEndMins !== null) {
                        if (nowMins >= teaStartMins && nowMins <= teaEndMins) {
                            allowed = true;
                            finalBreakType = 'Tea';
                        }
                    }
                }

                if (!allowed) {
                    if (isLunchRequest) {
                        return res.status(400).json({
                            success: false,
                            message: `You can only take Lunch between ${daySchedule?.lunchStart} and ${daySchedule?.lunchEnd}`
                        });
                    } else if (isTeaRequest) {
                        return res.status(400).json({
                            success: false,
                            message: `You can only take Tea Break between ${daySchedule?.teaStart} and ${daySchedule?.teaEnd}`
                        });
                    } else {
                        let errMsg = "You can only take breaks during your defined lunch or tea break timings.";
                        const ranges = [];
                        if (daySchedule?.lunchStart && daySchedule?.lunchEnd) {
                            ranges.push(`Lunch: ${daySchedule.lunchStart} - ${daySchedule.lunchEnd}`);
                        }
                        if (daySchedule?.teaStart && daySchedule?.teaEnd) {
                            ranges.push(`Tea: ${daySchedule.teaStart} - ${daySchedule.teaEnd}`);
                        }
                        if (ranges.length > 0) {
                            errMsg = `You can only take breaks during your defined timings:\n${ranges.join(', ')}`;
                        }
                        return res.status(400).json({
                            success: false,
                            message: errMsg
                        });
                    }
                }
            }

            record.breaks.push({ start: now, type: finalBreakType });
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
                workSummary: rq.workSummary,
                adminRemark: rq.adminRemark,
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
                workSummary: r.workSummary,
                lateInPenalty: r.lateInPenalty || { amount: 0, isApplied: false },
                earlyOutPenalty: r.earlyOutPenalty || { amount: 0, isApplied: false },
                approvalStatus: r.approvalStatus || "Pending",
                leaveCategory: r.leaveCategory || null,
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
// GET /api/attendance/admin/all?date=YYYY-MM-DD  (admin only)
export const getAdminAttendance = async (req, res) => {
    try {
        const { date, department, branch, status, approvalStatus } = req.query;
        const targetDate = date || getTodayStr();

        // 1. Get all active employees first
        let userQuery = { role: 'Employee', status: 'Active', adminId: req.user._id };
        if (department) userQuery.department = department;
        if (branch) userQuery['workSetup.location'] = branch;

        const allEmployees = await User.find(userQuery)
            .select('name employeeId department branch workSetup.location profilePhoto')
            .sort({ name: 1 });

        // 2. Get attendance records for this date
        const attendanceRecords = await Attendance.find({ date: targetDate, adminId: req.user._id });

        // 3. Merge them
        const data = allEmployees.map(emp => {
            const record = attendanceRecords.find(r => r.employee.toString() === emp._id.toString());
            const firstIn = record?.punches.find(p => p.type === 'IN');
            const lastOut = [...(record?.punches || [])].reverse().find(p => p.type === 'OUT');

            let attendanceStatus = record?.status || 'Absent';
            if (attendanceStatus === 'Present' && firstIn && !lastOut && targetDate === getTodayStr()) {
                attendanceStatus = 'Clocked In';
            }

            const workingMinutes = record ? computeWorkingMinutes(record.punches, record.breaks) : 0;
            const workingFormatted = formatMinutes(workingMinutes);

            return {
                _id: record?._id,
                employee: {
                    _id: emp._id,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department,
                    branch: emp.workSetup?.location || emp.branch,
                    profilePhoto: emp.profilePhoto,
                },
                date: record?.date || targetDate,
                status: attendanceStatus,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '---',
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '---',
                workingMinutes,
                workingFormatted,
                isLate: record?.lateInPenalty?.isLate || false,
                isEarly: record?.earlyOutPenalty?.isEarly || false,
                lateInPenalty: record?.lateInPenalty || { amount: 0, isApplied: false },
                earlyOutPenalty: record?.earlyOutPenalty || { amount: 0, isApplied: false },
                approvalStatus: record ? (record.approvalStatus || 'Pending') : 'N/A',
                punches: record?.punches || [],
                breaks: record?.breaks || []
            };
        });

        // 4. Filter by status if requested
        let filteredData = data;
        if (status && status !== 'All') {
            if (status === 'Present') {
                filteredData = data.filter(d => ['Present', 'Clocked In'].includes(d.status));
            } else {
                filteredData = data.filter(d => d.status === status);
            }
        }

        // Filter by approvalStatus if requested
        if (approvalStatus && approvalStatus !== 'All') {
            filteredData = filteredData.filter(d => d.approvalStatus === approvalStatus);
        }        // 5. Calculate Stats
        const stats = {
            total: data.length,
            present: data.filter(d => ['Present', 'Clocked In'].includes(d.status)).length,
            absent: data.filter(d => d.status === 'Absent').length,
            late: data.filter(d => d.isLate).length,
            onLeave: data.filter(d => d.status === 'On Leave').length,
            halfDay: data.filter(d => d.status === 'Half Day').length
        };

        res.status(200).json({ success: true, records: filteredData, stats, date: targetDate });
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

        if (await isMonthLocked(record.employee, record.date)) {
            return res.status(400).json({ success: false, message: "Attendance for this month has been locked/published and cannot be modified." });
        }

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

        if (await isMonthLocked(employeeId, date)) {
            return res.status(400).json({ success: false, message: "Attendance for this month has been locked/published and cannot be modified." });
        }

        // Helper to create date object in IST context but stored as UTC
        const createISTDate = (dateStr, timeStr) => {
            if (!timeStr) return null;
            // dateStr: YYYY-MM-DD, timeStr: HH:MM
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hour, minute] = timeStr.split(':').map(Number);
            // Create a Date object that represents the moment in IST
            // We subtract 5.5 hours to get the UTC equivalent
            const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
            d.setMinutes(d.getMinutes() - 330);
            return d;
        };

        // Prepare punches
        let punches = [];
        if (inTime) {
            punches.push({
                time: createISTDate(date, inTime),
                type: "IN",
                locationAddress: "-",
                lateReason: remark
            });
        }
        if (outTime) {
            punches.push({
                time: createISTDate(date, outTime),
                type: "OUT",
                locationAddress: "Admin Manual Entry",
                earlyReason: remark,
                workSummary: "Manual entry by admin"
            });
        }

        // Calculate Penalties if it's a "Present" status and we have punches
        let lateInPenalty = { amount: 0, isApplied: false, isLate: false };
        let earlyOutPenalty = { amount: 0, isApplied: false, isEarly: false };

        if (status === 'Present' && punches.length > 0) {
            const { shift: empShift, daySchedule } = await getEmployeeShiftToday(employeeId, date);
            if (empShift && daySchedule) {
                // Late In
                const firstIn = punches.find(p => p.type === 'IN');
                if (firstIn && daySchedule.shiftStart) {
                    const shiftStartMins = parseTimeToMinutes(daySchedule.shiftStart);
                    const inTimeObj = new Date(firstIn.time);
                    const istIn = new Date(inTimeObj.getTime() + (5.5 * 60 * 60 * 1000));
                    const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
                    const lateByMins = inMins - shiftStartMins;
                    if (lateByMins > 0) {
                        const amount = await calculatePenaltyAmount(empShift._id, lateByMins, employeeId);
                        lateInPenalty = { amount, isApplied: amount > 0, isLate: lateByMins > (empShift.maxLateInMinutes || 0) };
                    }
                }

                // Early Out
                const lastOut = [...punches].reverse().find(p => p.type === 'OUT');
                if (lastOut && daySchedule.shiftEnd) {
                    const shiftEndMins = parseTimeToMinutes(daySchedule.shiftEnd);
                    const outTimeObj = new Date(lastOut.time);
                    const istOut = new Date(outTimeObj.getTime() + (5.5 * 60 * 60 * 1000));
                    const outMins = istOut.getUTCHours() * 60 + istOut.getUTCMinutes();
                    const earlyByMins = shiftEndMins - outMins;
                    if (earlyByMins > 0) {
                        const amount = await calculatePenaltyAmount(empShift._id, earlyByMins, employeeId, null, null, 'Early Out Minutes');
                        earlyOutPenalty = { amount, isApplied: amount > 0, isEarly: true };
                    }
                }
            }
        }

        const record = await Attendance.findOneAndUpdate(
            { employee: employeeId, date },
            {
                $set: {
                    status,
                    punches,
                    lateInPenalty,
                    earlyOutPenalty,
                    approvalStatus: "Pending",
                    remark: remark || "Manual entry by admin",
                    adminId: req.user._id
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
        query.adminId = req.user._id;

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
        const attendanceRecords = await Attendance.find({ date, adminId: req.user._id }).select('employee status');

        // Filter those who are actually present
        const presentEmployeeIds = attendanceRecords
            .filter(r => ['Present', 'Clocked In', 'Half Day'].includes(r.status))
            .map(r => r.employee.toString());

        // Filter those who are excused (On Leave, Holiday)
        const excusedEmployeeIds = attendanceRecords
            .filter(r => ['On Leave', 'Holiday'].includes(r.status))
            .map(r => r.employee.toString());

        // 2. Get all active employees
        const employees = await User.find({
            role: 'Employee',
            status: 'Active',
            adminId: req.user._id
        })
            .select('name employeeId department designation profilePhoto workSetup phone branch')
            .populate('workSetup.shift', 'weekOffDays shiftName');

        // 3. Identify who is NOT present and NOT excused
        const absentees = employees.filter(emp =>
            !presentEmployeeIds.includes(emp._id.toString()) &&
            !excusedEmployeeIds.includes(emp._id.toString())
        );

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
                shiftName: emp.workSetup?.shift?.shiftName || 'Not Assigned'
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

const getCorrectStatus = (record, shift) => {
    if (!record) return 'Absent';
    let status = record.status || 'Present';
    if (!shift || !['Present', 'Half Day'].includes(status) || !record.punches || record.punches.length === 0) {
        return status;
    }

    const firstIn = record.punches.find(p => p.type === 'IN');
    const lastOut = [...record.punches].reverse().find(p => p.type === 'OUT');
    if (firstIn && !lastOut) {
        const now = new Date();
        const startTime = new Date(firstIn.time);
        if (now - startTime < 20 * 3600 * 1000) {
            return status;
        }
    }
    
    // Determine day of week
    const [yr, mo, dy] = record.date.split('-').map(Number);
    const recordDate = new Date(yr, mo - 1, dy);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName  = dayNames[recordDate.getDay()];
    
    const daySchedule = shift.schedule?.[dayName];
    if (!daySchedule) return status;
    
    const workingMinutes = computeWorkingMinutes(record.punches, record.breaks || []);
    
    let minFullDayMins = 8 * 60;
    let minHalfDayMins = 4 * 60;
    
    if (daySchedule.minFullDayHours > 0) {
        minFullDayMins = daySchedule.minFullDayHours * 60;
        if (daySchedule.minHalfHours > 0) {
            minHalfDayMins = daySchedule.minHalfHours * 60;
        } else {
            minHalfDayMins = Math.floor(minFullDayMins / 2);
        }
    } else if (daySchedule.shiftStart && daySchedule.shiftEnd) {
        const startM = parseTimeToMinutes(daySchedule.shiftStart);
        const endM   = parseTimeToMinutes(daySchedule.shiftEnd);
        if (startM !== null && endM !== null) {
            const shiftSpan = endM > startM ? endM - startM : (endM + 1440 - startM);
            let lunchMins = 0;
            if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                const lsM = parseTimeToMinutes(daySchedule.lunchStart);
                const leM = parseTimeToMinutes(daySchedule.lunchEnd);
                if (lsM !== null && leM !== null && leM > lsM) {
                    lunchMins = leM - lsM;
                }
            }
            const effectiveShiftMins = Math.max(shiftSpan - lunchMins, 1);
            minFullDayMins = effectiveShiftMins;
            minHalfDayMins = Math.floor(effectiveShiftMins / 2);
        }
    }
    
    if (workingMinutes < minHalfDayMins) {
        return 'Absent';
    } else if (workingMinutes < minFullDayMins) {
        return 'Half Day';
    }
    return 'Present';
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

        // Auto-heal incorrect status in database
        if (shift) {
            for (let r of records) {
                const corrected = getCorrectStatus(r, shift);
                if (r.status !== corrected) {
                    r.status = corrected;
                    await Attendance.updateOne({ _id: r._id }, { $set: { status: corrected } });
                }
            }
        }

        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // On-the-fly cleanup of older records that are within shift's grace minutes limit
        if (shift) {
            const graceMins = shift.maxLateInMinutes || 0;
            for (let r of records) {
                if (r.lateInPenalty?.isLate || r.lateInPenalty?.amount > 0) {
                    const firstIn = r.punches.find(p => p.type === 'IN');
                    const [yearStr, monthStr, dayStr] = r.date.split('-');
                    const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
                    const dayName = days[dateObj.getDay()].toLowerCase();
                    const daySchedule = shift.schedule?.[dayName];
                    if (firstIn && daySchedule?.shiftStart) {
                        const shiftStartMins = parseTimeToMinutes(daySchedule.shiftStart);
                        const inTime = new Date(firstIn.time);
                        const istIn = new Date(inTime.getTime() + (5.5 * 60 * 60 * 1000));
                        const inMins = istIn.getUTCHours() * 60 + istIn.getUTCMinutes();
                        const lateByMins = inMins - shiftStartMins;
                        if (lateByMins <= graceMins) {
                            r.lateInPenalty = { amount: 0, isApplied: false, isLate: false };
                            await Attendance.updateOne(
                                { _id: r._id },
                                { $set: { 'lateInPenalty.amount': 0, 'lateInPenalty.isApplied': false, 'lateInPenalty.isLate': false } }
                            );
                        }
                    }
                }
            }
        }

        const todayObj = new Date();
        const isCurrentMonth = todayObj.getFullYear() === year && (todayObj.getMonth() + 1) === monthNum;
        const maxDayToCount = isCurrentMonth ? todayObj.getDate() : daysInMonth;

        let workingDaysCount = 0;
        let weekOffCount = 0;
        let totalExpectedMins = 0;
        let elapsedWorkingDays = 0; // working days up to today

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, monthNum - 1, d);
            const dayName = days[dateObj.getDay()];
            const isWeekOff = weekOffDays.includes(dayName);

            if (isWeekOff) {
                weekOffCount++;
            } else {
                workingDaysCount++;
                if (d <= maxDayToCount) {
                    elapsedWorkingDays++;
                }
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

        const presentCount = records.filter(r => r.status === 'Present').length;
        const halfDaysCount = records.filter(r => r.status === 'Half Day').length;
        const leaveDaysCount = records.filter(r => r.status === 'On Leave').length;
        
        // Absent days are elapsed working days minus present and leave days
        const absentDays = Math.max(0, elapsedWorkingDays - (presentCount + (halfDaysCount * 0.5) + leaveDaysCount));

        const totalWorkedMins = records.reduce((acc, r) => acc + (computeWorkingMinutes(r.punches, r.breaks) || 0), 0);

        const stats = {
            workingDays: workingDaysCount,
            presentDays: presentCount + (halfDaysCount * 0.5),
            absentDays,
            weekOff: weekOffCount,
            leaves: leaveDaysCount,
            lateIn: records.filter(r => r.lateInPenalty?.isLate).length,
            earlyOut: records.filter(r => r.earlyOutPenalty?.amount > 0).length,
            missingPunch: records.filter(r => r.punches.find(p => p.type === 'IN') && !r.punches.find(p => p.type === 'OUT')).length,
            totalExpectedHours: Math.round(totalExpectedMins / 60),
            totalWorkedHours: Math.floor(totalWorkedMins / 60),
            totalWorkedMins: totalWorkedMins % 60,
            efficiency: Math.round((totalWorkedMins / (totalExpectedMins || 1)) * 100) || 0,
            totalExpectedMins
        };

        // Pre-fetch related leave and attendance correction requests for this month
        const requests = await Request.find({
            employee: employeeId,
            $or: [
                { date: { $regex: `^${month}` } },
                { fromDate: { $lte: `${month}-31` }, toDate: { $gte: `${month}-01` } }
            ]
        }).populate('leaveType', 'name');

        const formattedRecords = records.map(r => {
            const firstIn = r.punches.find(p => p.type === 'IN');
            const lastOut = [...r.punches].reverse().find(p => p.type === 'OUT');
            const workingMins = computeWorkingMinutes(r.punches, r.breaks);

            const dayRequests = requests.filter(req => {
                if (req.date === r.date) return true;
                if (req.fromDate && req.toDate && r.date >= req.fromDate && r.date <= req.toDate) return true;
                return false;
            });

            return {
                date: r.date,
                status: r.status,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                workingFormatted: formatMinutes(workingMins),
                approvalStatus: r.approvalStatus || 'Pending',
                punches: r.punches,
                breaks: r.breaks,
                lateInPenalty: r.lateInPenalty,
                earlyOutPenalty: r.earlyOutPenalty,
                workSummary: r.workSummary,
                requests: dayRequests
            };
        });

        res.status(200).json({
            success: true,
            stats,
            records: formattedRecords,
            requests,
            weekOffDays
        });
    } catch (error) {
        console.error("getMonthlyAttendanceStats error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getSpecificRecord = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        if (!employeeId || !date) {
            return res.status(400).json({ success: false, message: "Employee ID and Date are required" });
        }

        const record = await Attendance.findOne({ employee: employeeId, date });

        if (!record) {
            return res.status(200).json({ success: true, record: null });
        }

        const firstIn = record.punches.find(p => p.type === 'IN');
        const lastOut = [...record.punches].reverse().find(p => p.type === 'OUT');

        res.status(200).json({
            success: true,
            record: {
                _id: record._id,
                date: record.date,
                status: record.status,
                remark: record.remark || '',
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : null,
                approvalStatus: record.approvalStatus || "Pending"
            }
        });
    } catch (error) {
        console.error("getSpecificRecord error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/attendance/admin/recalculate-status
// Retroactively fix Half Day records by recomputing status from the day's actual shift
export const recalculateHalfDayStatus = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { startDate, endDate } = req.body;

        // Build filter — only Half Day records for this admin in the given date range
        const filter = { adminId, status: 'Half Day' };
        if (startDate && endDate) {
            filter.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            filter.date = { $gte: startDate };
        } else if (endDate) {
            filter.date = { $lte: endDate };
        }

        const records = await Attendance.find(filter);

        let fixed = 0;
        let skipped = 0;
        const details = [];

        for (const record of records) {
            // Only process records that have a complete punch cycle (IN + OUT)
            const firstIn  = record.punches.find(p => p.type === 'IN');
            const lastOut  = [...record.punches].reverse().find(p => p.type === 'OUT');
            if (!firstIn || !lastOut) { skipped++; continue; }

            // Load the employee with their shift
            const employee = await User.findById(record.employee).populate('workSetup.shift');
            if (!employee?.workSetup?.shift) { skipped++; continue; }

            const shift = employee.workSetup.shift;

            // Determine day of week from the attendance date string (YYYY-MM-DD)
            const [yr, mo, dy] = record.date.split('-').map(Number);
            const recordDate = new Date(yr, mo - 1, dy);
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName  = dayNames[recordDate.getDay()];

            const daySchedule = shift.schedule?.[dayName];
            if (!daySchedule?.shiftStart || !daySchedule?.shiftEnd) { skipped++; continue; }

            // ── Same dynamic threshold logic as the punch-out fix ──
            let minFullDayMins = 8 * 60;
            let minHalfDayMins = 4 * 60;

            if (daySchedule.minFullDayHours > 0) {
                minFullDayMins = daySchedule.minFullDayHours * 60;
                minHalfDayMins = daySchedule.minHalfHours > 0
                    ? daySchedule.minHalfHours * 60
                    : Math.floor(minFullDayMins / 2);
            } else {
                const startM = parseTimeToMinutes(daySchedule.shiftStart);
                const endM   = parseTimeToMinutes(daySchedule.shiftEnd);
                if (startM !== null && endM !== null) {
                    const shiftSpan = endM > startM ? endM - startM : (endM + 1440 - startM);
                    let lunchMins = 0;
                    if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                        const lsM = parseTimeToMinutes(daySchedule.lunchStart);
                        const leM = parseTimeToMinutes(daySchedule.lunchEnd);
                        if (lsM !== null && leM !== null && leM > lsM) lunchMins = leM - lsM;
                    }
                    const effectiveShiftMins = Math.max(shiftSpan - lunchMins, 1);
                    minFullDayMins = effectiveShiftMins;
                    minHalfDayMins = Math.floor(effectiveShiftMins / 2);
                }
            }

            const workingMinutes = computeWorkingMinutes(record.punches, record.breaks);

            let newStatus = 'Half Day';
            if (workingMinutes >= minFullDayMins) {
                newStatus = 'Present';
            } else if (workingMinutes < minHalfDayMins) {
                newStatus = 'Absent';
            }

            if (newStatus !== 'Half Day') {
                record.status = newStatus;
                await record.save();
                fixed++;
                details.push({
                    employeeId: employee.employeeId,
                    name: employee.name,
                    date: record.date,
                    day: dayName,
                    workingMinutes,
                    minFullDayMins,
                    oldStatus: 'Half Day',
                    newStatus
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `Fixed ${fixed} record(s). ${skipped} skipped (missing punch data or shift).`,
            fixed,
            total: records.length,
            skipped,
            details
        });
    } catch (error) {
        console.error('recalculateHalfDayStatus error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

// GET /api/attendance/admin/employee-monthly-summary
export const getEmployeeMonthlySummary = async (req, res) => {
    try {
        const { employeeId, month } = req.query; // employeeId, month (YYYY-MM)
        if (!employeeId || !month) {
            return res.status(400).json({ success: false, message: "employeeId and month (YYYY-MM) are required" });
        }

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        const employee = await User.findById(employeeId).populate('workSetup.shift');
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const shift = employee.workSetup?.shift;

        const monthAttendance = await Attendance.find({
            employee: employeeId,
            date: { $gte: startDate, $lte: endDate }
        });

        // Auto-heal incorrect status in database
        if (shift) {
            for (let r of monthAttendance) {
                const corrected = getCorrectStatus(r, shift);
                if (r.status !== corrected) {
                    r.status = corrected;
                    await Attendance.updateOne({ _id: r._id }, { $set: { status: corrected } });
                }
            }
        }

        const approvedLeaves = await Request.find({
            employee: employeeId,
            requestType: 'Leave',
            status: 'Approved',
            $or: [
                { fromDate: { $lte: endDate }, toDate: { $gte: startDate } },
                { date: { $gte: startDate, $lte: endDate } }
            ]
        });

        let usedPaidLeaves = 0;
        let usedUnpaidLeaves = 0;

        const limitStart = new Date(startDate);
        const limitEnd = new Date(endDate);

        approvedLeaves.forEach(l => {
            const start = new Date(l.fromDate);
            const end = new Date(l.toDate);

            // Calculate overlapping range within the current month
            const overlapStart = start > limitStart ? start : limitStart;
            const overlapEnd = end < limitEnd ? end : limitEnd;

            if (overlapStart <= overlapEnd) {
                if (l.leaveDuration === "Full Day") {
                    const diffDays = Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                    if (l.leaveCategory === 'Paid') {
                        usedPaidLeaves += diffDays;
                    } else {
                        usedUnpaidLeaves += diffDays;
                    }
                } else {
                    // Half-day leave is always 0.5 days
                    if (l.leaveCategory === 'Paid') {
                        usedPaidLeaves += 0.5;
                    } else {
                        usedUnpaidLeaves += 0.5;
                    }
                }
            }
        });

        let presentDaysCount = 0;
        let halfDaysCount = 0;
        let absentDaysCount = 0;
        let weekOffsPaid = 0;
        let holidaysPaid = 0;
        let extraDaysWorked = 0;
        let totalShiftWeekOffs = 0;
        let elapsedWorkingDays = 0;

        const todayObj = new Date();
        const isCurrentMonth = todayObj.getFullYear() === year && (todayObj.getMonth() + 1) === monthNum;
        const maxDayToCount = isCurrentMonth ? todayObj.getDate() : daysInMonth;

        const attendanceMap = {};
        monthAttendance.forEach(a => { attendanceMap[a.date] = a; });

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${month}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, monthNum - 1, d);
            const dayName = daysOfWeek[dateObj.getDay()];
            const isWeekOff = shift?.weekOffDays?.includes(dayName);

            if (isWeekOff) {
                totalShiftWeekOffs++;
                weekOffsPaid++;
            } else {
                if (d <= maxDayToCount) {
                    elapsedWorkingDays++;
                }
            }

            const record = attendanceMap[dayStr];

            if (record) {
                if (record.status === 'Present') {
                    if (isWeekOff) {
                        extraDaysWorked += 1;
                    } else {
                        presentDaysCount++;
                    }
                } else if (record.status === 'Half Day') {
                    if (isWeekOff) {
                        extraDaysWorked += 0.5;
                    } else {
                        halfDaysCount++;
                    }
                } else if (record.status === 'Absent') {
                    if (!isWeekOff) {
                        absentDaysCount++;
                    }
                } else if (record.status === 'Holiday') {
                    if (!isWeekOff) {
                        holidaysPaid++;
                    }
                }
            }
        }

        // True absent days = elapsed working days minus present, half (as 0.5), leave, and holiday days
        // True absent days = elapsed working days minus present, half (as 0.5), leave, and holiday days
        const trueAbsentDays = Math.max(0, elapsedWorkingDays - (presentDaysCount + (halfDaysCount * 0.5) + usedPaidLeaves + usedUnpaidLeaves + holidaysPaid));

        const missingPunches = monthAttendance
            .filter(a => {
                const hasIn = a.punches.some(p => p.type === 'IN');
                const hasOut = a.punches.some(p => p.type === 'OUT');
                return hasIn && !hasOut;
            })
            .map(a => a.date)
            .sort();

        res.status(200).json({
            success: true,
            summary: {
                present: presentDaysCount,
                halfDay: halfDaysCount,
                absent: trueAbsentDays,
                weekOff: weekOffsPaid,
                holiday: holidaysPaid,
                paidLeave: usedPaidLeaves,
                unpaidLeave: usedUnpaidLeaves + trueAbsentDays,
                extraDays: extraDaysWorked,
                monthWorkingDays: daysInMonth - totalShiftWeekOffs,
                missingPunches: missingPunches
            }
        });
    } catch (error) {
        console.error("getEmployeeMonthlySummary error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/admin/penalties
export const getAdminPenalties = async (req, res) => {
    try {
        const { month, branch, department, employeeId } = req.query;
        const adminId = req.user._id;

        let userQuery = { adminId, role: 'Employee', status: 'Active' };
        if (branch) userQuery.branch = branch;
        if (department) userQuery.department = department;
        if (employeeId) userQuery._id = employeeId;

        const employees = await User.find(userQuery).select('_id');
        const empIds = employees.map(e => e._id);

        let query = { employee: { $in: empIds }, adminId };
        if (month) {
            query.date = { $regex: `^${month}` };
        }

        query.$or = [
            { "lateInPenalty.amount": { $gt: 0 } },
            { "earlyOutPenalty.amount": { $gt: 0 } },
            { "lateInPenalty.isLate": true },
            { "earlyOutPenalty.isEarly": true }
        ];

        const records = await Attendance.find(query)
            .populate('employee', 'name employeeId department designation branch profilePhoto workSetup')
            .sort({ date: -1 });

        res.status(200).json({ success: true, records });
    } catch (error) {
        console.error("getAdminPenalties error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/attendance/admin/penalties/update
export const updateAdminPenalty = async (req, res) => {
    try {
        const { attendanceId, lateInAmount, earlyOutAmount, waiveLateIn, waiveEarlyOut } = req.body;
        const record = await Attendance.findById(attendanceId);
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        if (waiveLateIn) {
            record.lateInPenalty.amount = 0;
            record.lateInPenalty.isApplied = false;
        } else if (lateInAmount !== undefined) {
            record.lateInPenalty.amount = Number(lateInAmount);
            record.lateInPenalty.isApplied = Number(lateInAmount) > 0;
        }

        if (waiveEarlyOut) {
            record.earlyOutPenalty.amount = 0;
            record.earlyOutPenalty.isApplied = false;
        } else if (earlyOutAmount !== undefined) {
            record.earlyOutPenalty.amount = Number(earlyOutAmount);
            record.earlyOutPenalty.isApplied = Number(earlyOutAmount) > 0;
        }

        await record.save();
        res.status(200).json({ success: true, message: "Penalty updated successfully", record });
    } catch (error) {
        console.error("updateAdminPenalty error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



