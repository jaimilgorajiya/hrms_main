import { generateAndSendDailyReport } from '../utils/attendanceReport.js';
import Attendance from '../models/Attendance.Model.js';
import User from '../models/User.Model.js';
import { computeWorkingMinutes, formatMinutes } from '../utils/attendance.js';

const parseTimeToMinutes = (t) => {
    if (!t) return null;
    const clean = t.trim();
    const plain = clean.match(/(\d{1,2}):(\d{2})/);
    if (plain) return parseInt(plain[1]) * 60 + parseInt(plain[2]);
    return null;
};

export const triggerDailyReport = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ success: false, message: 'Unauthorized' });
        const { date } = req.body;
        const result = await generateAndSendDailyReport(req.user._id, date);
        if (result.success) res.status(200).json({ success: true, message: 'Daily report email sent successfully' });
        else res.status(500).json({ success: false, message: 'Failed to send report email', error: result.error });
    } catch (error) {
        console.error('Trigger Daily Report Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// GET /api/admin/reports/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&department=&employeeId=&status=
export const getAttendanceReport = async (req, res) => {
    try {
        const { from, to, department, employeeId, status } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: 'from and to dates are required' });

        // Build employee filter
        let empFilter = { role: { $ne: 'Admin' } };
        if (department) empFilter.department = department;
        if (employeeId) empFilter._id = employeeId;

        const employees = await User.find(empFilter).select('_id name employeeId department designation');
        const empIds = employees.map(e => e._id);
        const empMap = {};
        employees.forEach(e => { empMap[String(e._id)] = e; });

        // Build attendance filter
        let attFilter = { employee: { $in: empIds }, date: { $gte: from, $lte: to } };
        if (status && status !== 'All') attFilter.status = status;

        const records = await Attendance.find(attFilter).sort({ date: 1, employee: 1 });

        const rows = records.map(r => {
            const emp = empMap[String(r.employee)] || {};
            const firstIn = r.punches?.find(p => p.type === 'IN');
            const lastOut = [...(r.punches || [])].reverse().find(p => p.type === 'OUT');
            const workMins = computeWorkingMinutes(r.punches, r.breaks);
            return {
                date: r.date,
                employeeId: emp.employeeId || '',
                name: emp.name || '',
                department: emp.department || '',
                designation: emp.designation || '',
                status: r.status,
                punchIn: firstIn ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '—',
                punchOut: lastOut ? new Date(lastOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '—',
                workHours: formatMinutes(workMins),
                lateIn: r.lateInPenalty?.isLate ? 'Yes' : 'No',
                penalty: r.lateInPenalty?.amount || 0,
                approvalStatus: r.approvalStatus || 'Pending',
            };
        });

        // Summary stats
        const summary = {
            totalRecords: rows.length,
            present: rows.filter(r => r.status === 'Present').length,
            absent: rows.filter(r => r.status === 'Absent').length,
            halfDay: rows.filter(r => r.status === 'Half Day').length,
            onLeave: rows.filter(r => r.status === 'On Leave').length,
            lateIn: rows.filter(r => r.lateIn === 'Yes').length,
            totalPenalty: rows.reduce((a, r) => a + r.penalty, 0),
        };

        res.status(200).json({ success: true, rows, summary });
    } catch (error) {
        console.error('getAttendanceReport error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
