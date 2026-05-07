import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';
import Company from '../models/Company.Model.js';
import { sendDailyAttendanceReport } from './emailService.js';
import { computeWorkingMinutes, formatMinutes } from './attendance.js';

export const generateAndSendDailyReport = async (adminId, dateStr = null) => {
    try {
        const admin = await User.findById(adminId);
        if (!admin) throw new Error('Admin not found');

        // Resolve recipient: prefer hrEmail from company, fallback to companyEmail, then admin.email
        const company = await Company.findOne({ adminId: admin._id });
        const recipientEmail = company?.hrEmail || company?.companyEmail || admin.email;

        const now = new Date();
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = dateStr || ist.toISOString().split('T')[0];

        // 1. Get all non-admin employees linked to this admin (any status)
        //    This matches what the admin attendance panel shows
        const employees = await User.find({
            adminId: admin._id,
            role: { $in: ['Employee', 'Manager'] }
        }).select('name employeeId department designation status');

        // 2. Fetch today's attendance for these employees
        const empIds = employees.map(e => e._id);
        const attendance = await Attendance.find({
            date: todayStr,
            employee: { $in: empIds }
        });

        const attendanceMap = {};
        attendance.forEach(a => {
            attendanceMap[a.employee.toString()] = a;
        });

        // 3. Only include employees who either have an attendance record today
        //    OR are currently Active (to show absences for active staff)
        const relevantEmployees = employees.filter(emp =>
            emp.status === 'Active' || attendanceMap[emp._id.toString()]
        );

        // 4. Aggregate stats and build records
        const stats = { total: relevantEmployees.length, present: 0, absent: 0, halfDay: 0, onLeave: 0 };

        const records = relevantEmployees.map(emp => {
            const record = attendanceMap[emp._id.toString()];
            const status = record ? record.status : 'Absent';

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
                    punchIn = new Date(firstIn.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
                    });
                }
                if (lastOut) {
                    punchOut = new Date(lastOut.time).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
                    });
                }

                const mins = computeWorkingMinutes(record.punches, record.breaks);
                workHours = formatMinutes(mins);
            }

            return {
                name: emp.name,
                empId: emp.employeeId,
                dept: emp.department || '—',
                status,
                punchIn,
                punchOut,
                workHours
            };
        });

        // 5. Send email
        const reportData = {
            date: todayStr,
            stats,
            records: records.sort((a, b) => a.name.localeCompare(b.name))
        };

        const result = await sendDailyAttendanceReport(recipientEmail, reportData);
        return result;

    } catch (error) {
        console.error('Error generating daily report:', error);
        throw error;
    }
};
