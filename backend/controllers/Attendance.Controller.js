import Attendance from "../models/Attendance.Model.js";
import User from "../models/User.Model.js";
import Shift from "../models/Shift.Model.js";
import { computeWorkingMinutes, formatMinutes } from "../utils/attendance.js";

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
        if (!shift) return { shift: null, daySchedule: null, dayName: null };
        const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const dayName = days[new Date().getDay()];
        const daySchedule = shift.schedule?.[dayName] || null;
        return { shift, daySchedule, dayName };
    } catch { return { shift: null, daySchedule: null, dayName: null }; }
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

        res.status(200).json({
            success: true,
            record,
            status: record.status,
            isPunchedIn,
            isOnBreak,
            currentBreakType,
            workingMinutes,
            workingFormatted: formatMinutes(workingMinutes),
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

        let record = await Attendance.findOne({ employee: req.user._id, date });

        if (!record) {
            // First punch of the day must be IN
            const { shift, daySchedule } = await getEmployeeShiftToday(req.user._id);
            if (shift) {
                const shiftStartMins = parseTimeToMinutes(daySchedule?.shiftStart);
                if (shiftStartMins !== null) {
                    const nowMins = now.getHours() * 60 + now.getMinutes();
                    const lateByMins = nowMins - shiftStartMins;
                    const maxAllowed = shift.maxLateInMinutes || 0;
                    if (lateByMins > maxAllowed && shift.requireLateReason && !lateReason) {
                        return res.status(400).json({ 
                            success: false, 
                            requireLateReason: true, 
                            message: `You are punching in ${lateByMins}m late. Please provide a reason.` 
                        });
                    }
                }
            }

            record = new Attendance({
                employee: req.user._id,
                date,
                punches: [{
                    time: now,
                    type: 'IN',
                    latitude,
                    longitude,
                    geofenceReason,
                    workSummary,
                    lateReason,
                    locationAddress
                }],
                status: 'Present'
            });
            await record.save();

            return res.status(200).json({
                success: true,
                message: 'Punched In successfully',
                action: 'IN',
                time: now,
                isPunchedIn: true,
                isOnBreak: false,
                workingMinutes: 0,
                workingFormatted: '0h 0m',
                record
            });
        }

        // If record exists, we must handle the next action
        const lastPunch = record.punches[record.punches.length - 1];

        // RULE: If last punch was OUT, they cannot punch in again today.
        if (lastPunch.type === 'OUT') {
            return res.status(400).json({ 
                success: false, 
                message: "You have already completed your punch for today. You cannot punch in again until tomorrow." 
            });
        }

        // Action MUST be OUT if record exists (since IN is already the only other state)
        const action = 'OUT';

        // ── Early-out enforcement on PUNCH OUT ──
        const { shift, daySchedule } = await getEmployeeShiftToday(req.user._id);
        if (shift && daySchedule?.shiftEnd) {
            const shiftEndMins = parseTimeToMinutes(daySchedule.shiftEnd);
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const earlyByMins = shiftEndMins - nowMins;

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
                    } else {
                        maxAllowed = shift.maxLateInMinutes || 0;
                    }
                }

                if (earlyByMins > maxAllowed && shift.requireEarlyOutReason && !providedReason) {
                    return res.status(400).json({
                        success: false,
                        earlyOut: true,
                        earlyByMins,
                        requireReason: true,
                        message: `You were late ${shift.maxLateInMinutes - maxAllowed}m this morning. You can only leave ${maxAllowed}m early. Please provide a reason.`
                    });
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
            
            return {
                date: r.date,
                status: r.status,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
                workingMinutes,
                workingFormatted: formatMinutes(workingMinutes),
                breakCount: r.breaks.length,
                breakFormatted: formatMinutes(breakMinutes),
                punches: r.punches,
                breaks: r.breaks,
            };
        });

        const employee = await User.findById(employeeId).select('dateJoined');
        res.status(200).json({ 
            success: true, 
            records: formatted, 
            joiningDate: employee?.dateJoined ? new Date(employee.dateJoined).toISOString().split('T')[0] : null 
        });
    } catch (error) {
        console.error("getAttendanceHistory error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/attendance/admin/all?date=YYYY-MM-DD  (admin only)
export const getAdminAttendance = async (req, res) => {
    try {
        const { date, month } = req.query;
        let filter = {};
        if (date) filter.date = date;
        else if (month) filter.date = { $regex: `^${month}` };
        else filter.date = getTodayStr();

        const records = await Attendance.find(filter)
            .populate('employee', 'name employeeId department designation profilePhoto')
            .sort({ date: -1 });

        const formatted = records.map(r => {
            const workingMinutes = computeWorkingMinutes(r.punches, r.breaks);
            const firstIn = r.punches.find(p => p.type === 'IN');
            const lastOut = [...r.punches].reverse().find(p => p.type === 'OUT');
            return {
                _id: r._id,
                date: r.date,
                status: r.status,
                employee: r.employee,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
                workingMinutes,
                workingFormatted: formatMinutes(workingMinutes),
                breakCount: r.breaks.length,
                isPunchedIn: r.punches[r.punches.length - 1]?.type === 'IN',
                punches: r.punches,
                breaks: r.breaks
            };
        });

        res.status(200).json({ success: true, records: formatted, date: date || getTodayStr() });
    } catch (error) {
        console.error("getAdminAttendance error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
