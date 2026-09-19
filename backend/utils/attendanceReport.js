import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';
import Company from '../models/Company.Model.js';
import { sendDailyAttendanceReport } from './emailService.js';
import { computeWorkingMinutes, formatMinutes } from './attendance.js';
import { buildDailyAttendanceReportPdfBuffer } from './attendanceReportPdf.js';
import { sendWhatsAppDocument } from './whatsappNotify.js';

// Helper: normalize phone number to WhatsApp international format
const toWaPhone = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
};

// Helper: format date for display
const formatDateNice = (dateStr) => {
    try {
        const [y, m, d] = dateStr.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    } catch (_) {
        return dateStr;
    }
};

/**
 * Generate and send daily attendance report via Email and WhatsApp PDF document.
 * Called daily at 7:00 PM IST by the cron scheduler in cronJobs.js.
 *
 * @param {ObjectId|string} adminId
 * @param {string} [dateStr=null] - 'YYYY-MM-DD'
 * @returns {Promise<Object>}
 */
export const generateAndSendDailyReport = async (adminId, dateStr = null) => {
    try {
        const admin = await User.findById(adminId);
        if (!admin) throw new Error('Admin not found');

        // Resolve company document
        const company = await Company.findOne({ adminId: admin._id });

        // Resolve email recipient: prefer hrEmail, fallback to companyEmail, then admin.email
        const recipientEmail = company?.hrEmail || company?.companyEmail || admin.email;

        const now = new Date();
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const todayStr = dateStr || ist.toISOString().split('T')[0];

        // 1. Get all non-admin employees linked to this admin
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

        const sortedRecords = records.sort((a, b) => a.name.localeCompare(b.name));

        // 5. Generate PDF report buffer
        let pdfBuffer = null;
        try {
            pdfBuffer = await buildDailyAttendanceReportPdfBuffer({
                company,
                dateStr: todayStr,
                stats,
                records: sortedRecords
            });
        } catch (pdfErr) {
            console.error('[Daily Report] PDF generation error:', pdfErr.message);
        }

        // 6. Build and send Email report (with PDF attachment)
        const reportData = {
            date: todayStr,
            stats,
            records: sortedRecords
        };

        let emailResult = { success: false };
        try {
            emailResult = await sendDailyAttendanceReport(recipientEmail, reportData, pdfBuffer);
            console.log(`[Daily Report] Email report sent to: ${recipientEmail}`);
        } catch (emailErr) {
            console.error('[Daily Report] Email send error (non-blocking):', emailErr.message);
        }

        // 7. Send PDF document via WhatsApp to Company Contact Number
        let waResult = null;
        try {
            const rawCompanyContact = company?.companyContact || admin.whatsAppNumber || admin.phone;
            const waPhone = toWaPhone(rawCompanyContact);

            if (waPhone && pdfBuffer) {
                const filename = `Daily_Attendance_Report_${todayStr}.pdf`;
                const attendanceRate = stats.total > 0
                    ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100)
                    : 0;
                const displayDate = formatDateNice(todayStr);

                const caption =
                    `Daily Attendance Report — ${displayDate}\n` +
                    `Company: ${company?.companyName || 'IFLORA INFO PVT. LTD.'}\n\n` +
                    `Summary:\n` +
                    `• Total Staff: ${stats.total}\n` +
                    `• Present: ${stats.present}\n` +
                    `• Half Day: ${stats.halfDay}\n` +
                    `• On Leave: ${stats.onLeave}\n` +
                    `• Absent: ${stats.absent}\n` +
                    `• Attendance Rate: ${attendanceRate}%\n\n` +
                    `The complete attendance report PDF is attached above.`;

                waResult = await sendWhatsAppDocument(waPhone, pdfBuffer, filename, caption);
                console.log(`[Daily Report] WhatsApp PDF sent to company phone: ${waPhone} (${company?.companyName})`);
            } else if (!waPhone) {
                console.warn('[Daily Report] No valid company contact number found for WhatsApp report dispatch.');
            }
        } catch (waErr) {
            console.error('[Daily Report] WhatsApp PDF delivery error:', waErr.message);
        }

        return {
            success: true,
            email: emailResult,
            whatsapp: waResult
        };

    } catch (error) {
        console.error('Error generating daily report:', error);
        throw error;
    }
};
