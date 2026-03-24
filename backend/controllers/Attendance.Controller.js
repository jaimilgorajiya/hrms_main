import Attendance from "../models/Attendance.Model.js";
import User from "../models/User.Model.js";
import Shift from "../models/Shift.Model.js";

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

// Helper: compute working minutes from punches, subtracting break time
// If shift.deductBreakIfNotTaken=true and employee took no breaks, deduct scheduled lunch duration
const computeWorkingMinutes = (punches, breaks = [], shiftConfig = null) => {
    const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));

    let totalMs = 0;
    for (let i = 0; i < sorted.length - 1; i += 2) {
        if (sorted[i].type === 'IN' && sorted[i + 1]?.type === 'OUT') {
            totalMs += new Date(sorted[i + 1].time) - new Date(sorted[i].time);
        }
    }

    if (sorted.length % 2 !== 0 && sorted[sorted.length - 1]?.type === 'IN') {
        totalMs += Date.now() - new Date(sorted[sorted.length - 1].time);
    }

    // Subtract actual breaks taken
    breaks.forEach(b => {
        const start = new Date(b.start);
        const end = b.end ? new Date(b.end) : new Date();
        totalMs -= end - start;
    });

    // If deductBreakIfNotTaken is enabled and no breaks were taken, deduct scheduled lunch
    if (shiftConfig?.deductBreakIfNotTaken && breaks.length === 0) {
        const { daySchedule } = shiftConfig;
        if (daySchedule) {
            const lunchStart = parseTimeToMinutes(daySchedule.lunchStart);
            const lunchEnd = parseTimeToMinutes(daySchedule.lunchEnd);
            if (lunchStart !== null && lunchEnd !== null && lunchEnd > lunchStart) {
                totalMs -= (lunchEnd - lunchStart) * 60000;
            }
        }
    }

    return Math.max(0, Math.round(totalMs / 60000));
};

// Helper: format minutes to "Xh Ym"
const formatMinutes = (mins) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
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

        const lastBreak = record.breaks[record.breaks.length - 1];
        const isOnBreak = lastBreak && !lastBreak.end;

        const workingMinutes = computeWorkingMinutes(record.punches, record.breaks);

        res.status(200).json({
            success: true,
            record,
            status: record.status,
            isPunchedIn,
            isOnBreak,
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
    const { reason, latitude, longitude, geofenceReason, workSummary, earlyReason } = req.body; // reason=early-out, geofenceReason=out-of-range, earlyReason=custom logic
        const date = getTodayStr();
        const now = new Date();

        let record = await Attendance.findOne({ employee: req.user._id, date });

        if (!record) {
            // First punch of the day must be IN
            record = new Attendance({
                employee: req.user._id,
                date,
                punches: [{
                    time: now,
                    type: 'IN',
                    latitude,
                    longitude,
                    geofenceReason,
                    workSummary
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
                const maxAllowed = shift.maxEarlyOutMinutes ?? 0;

                if (earlyByMins > maxAllowed && !providedReason) {
                    return res.status(400).json({
                        success: false,
                        earlyOut: true,
                        earlyByMins,
                        requireReason: true,
                        message: `You are trying to punch out ${earlyByMins} min early. Please provide a reason.`
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
            earlyReason: earlyReason || reason
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
                punches: r.punches,
                breaks: r.breaks,
            };
        });

        res.status(200).json({ success: true, records: formatted });
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
