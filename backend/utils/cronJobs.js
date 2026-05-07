import cron from 'node-cron';
import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';
import { generateAndSendDailyReport } from './attendanceReport.js';

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

export const initCronJobs = () => {
    // Run at 23:59 (11:59 PM) every day
    // Pattern: minute hour dayOfMonth month dayOfWeek
    cron.schedule('59 23 * * *', async () => {
        console.log('[CRON] Running Midnight Absence Marking...');
        try {
            const todayStr = getTodayStr();
            const dayName = getDayName(todayStr);

            // 1. Get all active employees with their shifts populated
            const employees = await User.find({ status: 'Active', role: 'Employee' })
                .populate('workSetup.shift');

            let markedCount = 0;
            let skippedCount = 0;

            for (const emp of employees) {
                // 2. Check if attendance record exists for today
                // Attendance might already exist if they are Present, Half Day, or On Leave
                const record = await Attendance.findOne({ employee: emp._id, date: todayStr });
                
                if (!record) {
                    // 3. No record found. Check if today is their Week Off
                    const weekOffDays = emp.workSetup?.shift?.weekOffDays || [];
                    const isWeekOff = weekOffDays.includes(dayName);

                    if (!isWeekOff) {
                        // 4. Mark as Absent
                        await Attendance.create({
                            employee: emp._id,
                            date: todayStr,
                            status: 'Absent',
                            approvalStatus: 'Approved',
                            remark: 'Auto-marked Absent (Midnight Sync)',
                            punches: [],
                            lateInPenalty: { amount: 0, isApplied: false, isLate: false },
                            earlyOutPenalty: { amount: 0, isApplied: false }
                        });
                        markedCount++;
                    } else {
                        // It's a Week Off and no work was logged
                        skippedCount++;
                    }
                } else {
                    // Record already exists (Present/Leave/Manual)
                    skippedCount++;
                }
            }

            console.log(`[CRON] Midnight Absence Marking finished for ${todayStr}. Marked Absent: ${markedCount}, Skipped: ${skippedCount}`);
        } catch (error) {
            console.error('[CRON] Error in Midnight Absence Marking:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('[CRON] Scheduled Midnight Absence Marking at 11:59 PM IST');

    // 2. Daily Attendance Report
    // Run at 19:00 (7:00 PM) every day
    cron.schedule('0 19 * * *', async () => {
        console.log('[CRON] Running Daily Attendance Report Emailer...');
        try {
            const admins = await User.find({ role: 'Admin', status: 'Active' });
            for (const admin of admins) {
                const result = await generateAndSendDailyReport(admin._id);
                // recipient is resolved inside generateAndSendDailyReport from company settings
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
};
