import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';
import { sendDailyAttendanceReport } from './emailService.js';
import { computeWorkingMinutes, formatMinutes } from './attendance.js';

export const generateAndSendDailyReport = async (adminId, dateStr = null) => {
    try {
        const admin = await User.findById(adminId);
        if (!admin) throw new Error('Admin not found');

        const now = new Date();
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = dateStr || ist.toISOString().split('T')[0];

        // 1. Fetch all active employees
        const employees = await User.find({ adminId, status: 'Active', role: 'Employee' })
            .select('name employeeId department designation');

        // 2. Fetch all attendance for today
        const attendance = await Attendance.find({ 
            date: todayStr,
            employee: { $in: employees.map(e => e._id) }
        });

        const attendanceMap = {};
        attendance.forEach(a => {
            attendanceMap[a.employee.toString()] = a;
        });

        // 3. Aggregate stats and format records
        const stats = { total: employees.length, present: 0, absent: 0, halfDay: 0, onLeave: 0 };
        const records = employees.map(emp => {
            const record = attendanceMap[emp._id.toString()];
            const status = record ? record.status : 'Absent';

            // Stats
            if (status === 'Present') stats.present++;
            else if (status === 'Absent') stats.absent++;
            else if (status === 'Half Day') stats.halfDay++;
            else stats.onLeave++;

            let punchIn = '--:--';
            let punchOut = '--:--';
            let workHours = '0h 0m';

            if (record) {
                const firstIn = record.punches.find(p => p.type === 'IN');
                const lastOut = [...record.punches].reverse().find(p => p.type === 'OUT');
                
                if (firstIn) {
                    punchIn = new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
                if (lastOut) {
                    punchOut = new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
                
                const mins = computeWorkingMinutes(record.punches, record.breaks);
                workHours = formatMinutes(mins);
            }

            return {
                name: emp.name,
                empId: emp.employeeId,
                dept: emp.department,
                status,
                punchIn,
                punchOut,
                workHours
            };
        });

        // 4. Send Email
        const reportData = {
            date: todayStr,
            stats,
            records: records.sort((a, b) => a.name.localeCompare(b.name))
        };

        const result = await sendDailyAttendanceReport(admin.email, reportData);
        return result;

    } catch (error) {
        console.error('Error generating daily report:', error);
        throw error;
    }
};
