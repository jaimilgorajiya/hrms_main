import cron from 'node-cron';
import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';
import { generateAndSendDailyReport } from './attendanceReport.js';
import { sendWhatsAppMessage } from './whatsappNotify.js';

// Helper: get today's date string YYYY-MM-DD in IST
const getTodayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
};

// Helper: get day name from date string
const getDayName = (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateStr);
    return days[date.getUTCDay()];
};

// Helper: parse "HH:MM" string into minutes-since-midnight
const timeStrToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

// Helper: normalize phone number to WhatsApp international format
const toWaPhone = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
};

// In-memory tracker: prevent multiple reminders per employee per day
// Maps "employeeId:YYYY-MM-DD" -> true
const punchInReminderSent = new Map();
const punchOutReminderSent = new Map();

export const initCronJobs = () => {
    // ── Job 1: Midnight Absence Marking ──
    // Run at 23:59 (11:59 PM) every day IST
    cron.schedule('59 23 * * *', async () => {
        console.log('[CRON] Running Midnight Absence Marking...');
        try {
            const todayStr = getTodayStr();
            const dayName = getDayName(todayStr);

            // 1. Get all active employees with their shifts populated
            const employees = await User.find({
                status: 'Active',
                role: 'Employee'
            }).populate('workSetup.shift');

            // 2. Fetch all attendance records for today in one query
            const todayAttendance = await Attendance.find({ date: todayStr }).select('employee');
            const presentEmpIds = new Set(todayAttendance.map(a => a.employee.toString()));

            const absentRecordsToCreate = [];
            let skippedCount = 0;

            for (const emp of employees) {
                const hasRecord = presentEmpIds.has(emp._id.toString());

                if (!hasRecord) {
                    // 3. No record found. Check if today is their Week Off
                    const weekOffDays = emp.workSetup?.shift?.weekOffDays || [];
                    const isWeekOff = weekOffDays.includes(dayName);
                    if (!isWeekOff) {
                        // 4. Prepare Absent record
                        absentRecordsToCreate.push({
                            employee: emp._id,
                            adminId: emp.adminId || emp._id,
                            date: todayStr,
                            status: 'Absent',
                            approvalStatus: 'Approved',
                            remark: 'Auto-marked Absent (Midnight Sync)',
                            punches: [],
                            lateInPenalty: { amount: 0, isApplied: false, isLate: false },
                            earlyOutPenalty: { amount: 0, isApplied: false }
                        });
                    } else {
                        // It's a Week Off and no work was logged
                        skippedCount++;
                    }
                } else {
                    // Record already exists (Present/Leave/Manual)
                    skippedCount++;
                }
            }

            // 5. Bulk insert absent records
            if (absentRecordsToCreate.length > 0) {
                await Attendance.insertMany(absentRecordsToCreate);
            }

            const markedCount = absentRecordsToCreate.length;
            console.log(`[CRON] Midnight Absence Marking finished for ${todayStr}. Marked Absent: ${markedCount}, Skipped: ${skippedCount}`);
        } catch (error) {
            console.error('[CRON] Error in Midnight Absence Marking:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('[CRON] Scheduled Midnight Absence Marking at 11:59 PM IST');

    // ── Job 2: Daily Attendance Report ──
    // Run at 19:00 (7:00 PM) every day IST
    cron.schedule('0 19 * * *', async () => {
        console.log('[CRON] Running Daily Attendance Report Emailer...');
        try {
            const admins = await User.find({ role: 'Admin', status: 'Active' });
            for (const admin of admins) {
                const result = await generateAndSendDailyReport(admin._id);
                console.log(`[CRON] Report processed for Admin: ${admin.name} (${admin.email}) → success: ${result.success}`);
            }
        } catch (error) {
            console.error('[CRON] Error in Daily Attendance Report:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('[CRON] Scheduled Daily Attendance Report at 07:00 PM IST');

    // ── Job 3: Feature 3 — Punch-In Reminder ──
    // Check every 5 minutes. Send reminder 15 min after shift start if not punched in.
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const todayStr = ist.toISOString().split('T')[0];
            const dayName = getDayName(todayStr).toLowerCase();
            const nowMinutes = ist.getHours() * 60 + ist.getMinutes();

            const employees = await User.find({
                status: 'Active',
                role: { $in: ['Employee', 'Manager'] }
            })
                .populate('workSetup.shift')
                .select('name phone whatsAppNumber workSetup');

            for (const emp of employees) {
                const shift = emp.workSetup?.shift;
                if (!shift) continue;

                // Get shift start for today's day
                const daySchedule = shift.sameRulesForAllDays
                    ? shift.schedule?.monday
                    : shift.schedule?.[dayName];

                const shiftStartStr = daySchedule?.shiftStart;
                if (!shiftStartStr) continue;

                const shiftStartMins = timeStrToMinutes(shiftStartStr);
                if (shiftStartMins === null) continue;

                // Only send reminder 15-60 minutes after shift start
                const minutesLate = nowMinutes - shiftStartMins;
                if (minutesLate < 15 || minutesLate > 60) continue;

                // Check if reminder already sent today
                const remKey = `${emp._id}:${todayStr}`;
                if (punchInReminderSent.has(remKey)) continue;

                // Check if employee has punched in today
                const record = await Attendance.findOne({ employee: emp._id, date: todayStr }).select('punches status');
                if (record && (record.punches?.length > 0 || record.status === 'On Leave' || record.status === 'Holiday' || record.status === 'Week Off')) {
                    punchInReminderSent.set(remKey, true); // already handled, don't remind
                    continue;
                }

                const phone = toWaPhone(emp.whatsAppNumber || emp.phone);
                if (!phone) continue;

                await sendWhatsAppMessage(
                    phone,
                    `Attendance Reminder\n\nHello ${emp.name}, your shift started at ${shiftStartStr}. Please punch in if you haven't already.\n\nReply *punch in* to record your attendance.`
                );

                punchInReminderSent.set(remKey, true);
                console.log(`[CRON] Punch-in reminder sent to ${emp.name} (${phone})`);
            }
        } catch (err) {
            console.error('[CRON] Punch-in reminder error:', err.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('[CRON] Scheduled Punch-In Reminder (every 5 min, triggers 15 min after shift start) IST');

    // ── Job 4: Feature 3 — Punch-Out Reminder ──
    // Check every 5 minutes. Send reminder 15 min after shift end if still punched in.
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const todayStr = ist.toISOString().split('T')[0];
            const dayName = getDayName(todayStr).toLowerCase();
            const nowMinutes = ist.getHours() * 60 + ist.getMinutes();

            const employees = await User.find({
                status: 'Active',
                role: { $in: ['Employee', 'Manager'] }
            })
                .populate('workSetup.shift')
                .select('name phone whatsAppNumber workSetup');

            for (const emp of employees) {
                const shift = emp.workSetup?.shift;
                if (!shift) continue;

                const daySchedule = shift.sameRulesForAllDays
                    ? shift.schedule?.monday
                    : shift.schedule?.[dayName];

                const shiftEndStr = daySchedule?.shiftEnd;
                if (!shiftEndStr) continue;

                const shiftEndMins = timeStrToMinutes(shiftEndStr);
                if (shiftEndMins === null) continue;

                // Only send reminder 15-60 minutes after shift end
                const minutesOver = nowMinutes - shiftEndMins;
                if (minutesOver < 15 || minutesOver > 60) continue;

                // Check if reminder already sent today
                const remKey = `${emp._id}:${todayStr}`;
                if (punchOutReminderSent.has(remKey)) continue;

                // Check if employee is currently punched in (last punch is IN)
                const record = await Attendance.findOne({ employee: emp._id, date: todayStr }).select('punches');
                if (!record || !record.punches?.length) continue;
                const lastPunch = record.punches[record.punches.length - 1];
                if (lastPunch?.type !== 'IN') {
                    punchOutReminderSent.set(remKey, true); // already punched out
                    continue;
                }

                const phone = toWaPhone(emp.whatsAppNumber || emp.phone);
                if (!phone) continue;

                await sendWhatsAppMessage(
                    phone,
                    `Attendance Reminder\n\nHello ${emp.name}, your shift ended at ${shiftEndStr}. Don't forget to punch out and submit your work report!\n\nReply *punch out* to complete your attendance.`
                );

                punchOutReminderSent.set(remKey, true);
                console.log(`[CRON] Punch-out reminder sent to ${emp.name} (${phone})`);
            }
        } catch (err) {
            console.error('[CRON] Punch-out reminder error:', err.message);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('[CRON] Scheduled Punch-Out Reminder (every 5 min, triggers 15 min after shift end) IST');
};

