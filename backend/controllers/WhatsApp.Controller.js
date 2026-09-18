/**
 * WhatsApp.Controller.js
 *
 * This is the core chatbot engine for HRMS WhatsApp integration.
 * It handles Meta Cloud API webhook verification, incoming message parsing,
 * intent detection, and action execution (punch, leave, salary slip, etc.)
 *
 * FLOW:
 *  1. Meta sends a POST to /api/whatsapp/webhook whenever an employee messages your WhatsApp number
 *  2. We extract the phone number + message text
 *  3. We look up which HRMS employee owns that phone number
 *  4. We detect what they want (punch in, leave, salary slip, help, etc.)
 *  5. We execute the action directly against the database
 *  6. We send a reply back to the employee on WhatsApp
 */

import axios from 'axios';
import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';
import Request from '../models/Request.Model.js';
import SalarySlip from '../models/SalarySlip.Model.js';
import Payout from '../models/Payout.Model.js';
import LeaveType from '../models/LeaveType.Model.js';
import LeaveGroup from '../models/LeaveGroup.Model.js';
import Branch from '../models/Branch.Model.js';
import Notification from '../models/Notification.Model.js';
import Holiday from '../models/Holiday.Model.js';
import Shift from '../models/Shift.Model.js';
import WhatsAppSession from '../models/WhatsAppSession.Model.js';
import { getEmployeeShiftToday, getShiftDurationMinutes } from './Attendance.Controller.js';
import { computeWorkingMinutes } from '../utils/attendance.js';
import { buildPayslipPdfBuffer } from './Payroll.Controller.js';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Get today's date as YYYY-MM-DD in IST */
const getTodayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
};

/** Format a Date as "9:32 AM" in IST */
const formatTimeIST = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

/** Format today's date nicely e.g. "12 Sep 2025" */
const formatDateNice = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

/** Month name to number. e.g. "january" → 1 */
const monthNameToNumber = (name) => {
    const map = {
        january:1, february:2, march:3, april:4, may:5, june:6,
        july:7, august:8, september:9, october:10, november:11, december:12
    };
    return map[name?.toLowerCase().trim()] || null;
};

/** Parse YYYY-MM from user text (supports "june 2026", "2026-06", "06 2026", "may", etc.) */
const parseMonthYearFromText = (text) => {
    const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const lower = text.toLowerCase();

    // 1. Check for YYYY-MM or YYYY/MM pattern e.g. "2026-06"
    const isoMatch = lower.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])\b/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

    // 2. Check for 4-digit year
    let year = null;
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    if (yearMatch) year = parseInt(yearMatch[1], 10);

    // 3. Check for month name (full or short)
    let monthNum = null;
    for (let i = 0; i < monthNames.length; i++) {
        const regex = new RegExp(`\\b(${monthNames[i]}|${shortMonths[i]})\\b`, 'i');
        if (regex.test(lower)) {
            monthNum = i + 1;
            break;
        }
    }

    // 4. Check for digit month + year (e.g. "06 2026" or "6 2026")
    if (!monthNum && year) {
        const digitMatch = lower.match(/\b(0?[1-9]|1[0-2])\s+(20\d{2})\b/);
        if (digitMatch) monthNum = parseInt(digitMatch[1], 10);
    }

    if (monthNum) {
        const targetYear = year || new Date().getFullYear();
        return `${targetYear}-${String(monthNum).padStart(2, '0')}`;
    }

    return null;
};

/**
 * Normalize phone number for lookup.
 * WhatsApp sends numbers like "919876543210" (country code + number, no +)
 * Our DB might store "9876543210" or "+919876543210" or "919876543210"
 * We strip leading "91" for India and try multiple formats.
 */
const normalizePhone = (waPhone) => {
    const clean = waPhone.replace(/\D/g, '');
    if (clean.startsWith('91') && clean.length === 12) {
        return clean.substring(2); // strip country code → 10-digit
    }
    return clean;
};

/**
 * Find employee by WhatsApp phone number.
 * Tries exact match, then strips country code.
 */
const findEmployeeByPhone = async (waPhone) => {
    const normalized = normalizePhone(waPhone);
    // Try plain 10-digit, full with country code, with + prefix, or ending with the 10-digit number
    const variants = [normalized, waPhone, `+${waPhone}`, `91${normalized}`, `+91${normalized}`];
    
    // First try exact variants
    let user = await User.findOne({
        phone: { $in: variants },
        role: { $in: ['Employee', 'employee', 'Manager', 'Admin'] },
        status: { $nin: ['Inactive', 'Ex-Employee', 'Terminated', 'Absconding', 'Retired'] }
    })
        .populate('leaveGroup')
        .select('_id name employeeId phone adminId branch department designation leaveGroup requireSelfie whatsAppPunchEnabled');

    if (user) return user;

    // Fallback: match any phone ending with the 10 digits
    if (normalized && normalized.length >= 10) {
        const last10 = normalized.slice(-10);
        user = await User.findOne({
            phone: { $regex: new RegExp(last10 + '$') },
            role: { $in: ['Employee', 'employee', 'Manager', 'Admin'] },
            status: { $nin: ['Inactive', 'Ex-Employee', 'Terminated', 'Absconding', 'Retired'] }
        })
            .populate('leaveGroup')
            .select('_id name employeeId phone adminId branch department designation leaveGroup requireSelfie whatsAppPunchEnabled');
    }

    return user || null;
};

// ─────────────────────────────────────────────────────────────────
// SEND MESSAGE VIA META CLOUD API
// ─────────────────────────────────────────────────────────────────

/**
 * Send a plain text message to a WhatsApp number.
 * Uses Meta Cloud API v19.0
 */
const sendWhatsAppMessage = async (to, message) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !token || phoneNumberId === 'your_phone_number_id_here') {
        console.warn('[WhatsApp] Credentials not configured. Skipping send.');
        return;
    }

    try {
        const resp = await axios.post(
            `${process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0'}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`[WhatsApp] Message successfully sent to ${to} (Message ID: ${resp.data?.messages?.[0]?.id})`);
    } catch (err) {
        console.error('[WhatsApp] Failed to send message:', err.response?.data || err.message);
    }
};

/**
 * Send a document (PDF) to a WhatsApp number.
 * 1. Uploads media to Meta Cloud API /media endpoint.
 * 2. Sends a document message referencing the media ID.
 */
export const sendWhatsAppDocument = async (to, buffer, filename, caption = '') => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';

    if (!phoneNumberId || !token || phoneNumberId === 'your_phone_number_id_here') {
        console.warn('[WhatsApp] Credentials not configured. Skipping document send.');
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'application/pdf');
        const blob = new Blob([buffer], { type: 'application/pdf' });
        formData.append('file', blob, filename);

        const uploadRes = await axios.post(`${apiUrl}/${phoneNumberId}/media`, formData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const mediaId = uploadRes.data?.id;
        if (!mediaId) {
            throw new Error('Meta media upload did not return an id');
        }

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'document',
            document: {
                id: mediaId,
                filename,
                ...(caption ? { caption } : {})
            }
        };

        const msgRes = await axios.post(`${apiUrl}/${phoneNumberId}/messages`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[WhatsApp] PDF Document sent to ${to} (Message ID: ${msgRes.data?.messages?.[0]?.id})`);
        return msgRes.data;
    } catch (err) {
        console.error('[WhatsApp] Failed to send document:', err.response?.data || err.message);
        throw err;
    }
};

// ─────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────

const detectIntent = (text) => {
    const t = text.toLowerCase().trim();

    // Punch in
    if (/\b(punch\s*in|checkin|check\s*in|sign\s*in|login|log\s*in|in)\b/.test(t)) return 'PUNCH_IN';

    // Punch out
    if (/\b(punch\s*out|checkout|check\s*out|sign\s*out|logout|log\s*out|out)\b/.test(t)) return 'PUNCH_OUT';

    // Apply leave
    if (/\b(apply\s*leave|leave\s*apply|take\s*leave|request\s*leave|need\s*leave)\b/.test(t)) return 'APPLY_LEAVE';

    // Salary slip — can include month/year like "salary slip january 2025"
    if (/\b(salary\s*slip|payslip|pay\s*slip|salary)\b/.test(t)) return 'SALARY_SLIP';

    // Leave balance
    if (/\b(balance|leave\s*balance|remaining\s*leave|leaves\s*left)\b/.test(t)) return 'LEAVE_BALANCE';

    // Monthly attendance report — e.g. "monthly attendance", "attendance report", "monthly report", "monthly summary"
    const monthWords = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec';
    const hasMonthName = new RegExp(`\\b(${monthWords})\\b`, 'i').test(t);
    const hasMonthDigits = /\b20\d{2}[-/](0[1-9]|1[0-2])\b/.test(t);

    if (/\b(attendance|report)\b/.test(t) && (hasMonthName || hasMonthDigits || /\b(month|monthly|summary)\b/.test(t))) {
        return 'MONTHLY_ATTENDANCE';
    }

    if (/\b(monthly\s*attendance|attendance\s*report|monthly\s*report|month\s*attendance|attendance\s*summary|monthly\s*summary)\b/.test(t)) {
        return 'MONTHLY_ATTENDANCE';
    }

    // Today's attendance status
    if (/\b(attendance|my\s*attendance|status|today)\b/.test(t)) return 'ATTENDANCE_STATUS';

    // Numbered shortcuts
    if (/^(1|1\.)\b/.test(t) || t === '1') return 'PUNCH_IN';
    if (/^(2|2\.)\b/.test(t) || t === '2') return 'PUNCH_OUT';
    if (/^(3|3\.)\b/.test(t) || t === '3') return 'ATTENDANCE_STATUS';
    if (/^(4|4\.)\b/.test(t) || t === '4') return 'MONTHLY_ATTENDANCE';
    if (/^(5|5\.)\b/.test(t) || t === '5') return 'LEAVE_BALANCE';
    if (/^(6|6\.)\b/.test(t) || t === '6') return 'APPLY_LEAVE';
    if (/^(7|7\.)\b/.test(t) || t === '7') return 'SALARY_SLIP';

    // Help / Menu
    if (/\b(help|commands|hi|hello|start|menu|options|services|list)\b/.test(t)) return 'HELP';

    return 'UNKNOWN';
};

// ─────────────────────────────────────────────────────────────────
// ACTION HANDLERS
// ─────────────────────────────────────────────────────────────────

/** Handle PUNCH IN */
const handlePunchIn = async (employee, waPhone) => {
    const date = getTodayStr();
    const now = new Date();

    // Check if already punched in
    const record = await Attendance.findOne({ employee: employee._id, date });
    const lastPunch = record?.punches?.length > 0 ? record.punches[record.punches.length - 1] : null;

    if (lastPunch?.type === 'IN') {
        return `You are already punched in today at ${formatTimeIST(lastPunch.time)}.\nSend *punch out* when you leave.`;
    }

    // Block punch-in if already punched out today
    const hasPunchedOut = record?.punches?.some(p => p.type === 'OUT');
    if (hasPunchedOut) {
        const outPunch = record.punches.slice().reverse().find(p => p.type === 'OUT');
        return `You have already punched out for today at ${formatTimeIST(outPunch.time)}.\n\nYou cannot punch in again today. See you tomorrow!`;
    }

    if (record?.status === 'On Leave') {
        return `You are marked as "On Leave" for today. Attendance cannot be logged.`;
    }

    // Determine status
    const { daySchedule, shift } = await getEmployeeShiftToday(employee._id, date);
    let punchStatus = 'Present';

    if (daySchedule?.shiftStart && shift) {
        const [sh, sm] = daySchedule.shiftStart.split(':').map(Number);
        const shiftStartMins = sh * 60 + sm;
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const nowMins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
        const lateBy = nowMins - shiftStartMins;

        if (daySchedule.shiftEnd) {
            const [eh, em] = daySchedule.shiftEnd.split(':').map(Number);
            const shiftEndMins = eh * 60 + em;
            const duration = shiftEndMins > shiftStartMins ? shiftEndMins - shiftStartMins : shiftEndMins + 1440 - shiftStartMins;
            const midpointMins = (shiftStartMins + duration / 2) % 1440;
            if (nowMins > midpointMins) punchStatus = 'Half Day';
        }
    }

    const punchEntry = {
        time: now,
        type: 'IN',
        locationAddress: 'Via WhatsApp'
    };

    let updatedRecord;
    if (!record) {
        updatedRecord = await Attendance.create({
            employee: employee._id,
            adminId: employee.adminId || employee._id,
            date,
            punches: [punchEntry],
            status: punchStatus
        });
    } else {
        record.punches.push(punchEntry);
        if (record.status !== 'On Leave') record.status = punchStatus;
        await record.save();
        updatedRecord = record;
    }

    // Notify admin
    try {
        const timeStr = formatTimeIST(now);
        await Notification.create({
            user: employee.adminId,
            title: 'Employee Punched In (WhatsApp)',
            message: `${employee.name} (${employee.employeeId || ''}) punched in via WhatsApp at ${timeStr} on ${formatDateNice(date)}.`,
            type: 'Attendance'
        });
    } catch (_) { /* Non-critical */ }

    return `Punched in successfully!\n\nName: ${employee.name}\nTime: ${formatTimeIST(now)}\nDate: ${formatDateNice(date)}\nStatus: ${punchStatus}\n\nSend *punch out* when you leave.`;
};

/** Execute and save PUNCH OUT with work report */
const completePunchOut = async (employee, record, workReport, waPhone) => {
    const now = new Date();
    const date = record.date || getTodayStr();

    const punchEntry = {
        time: now,
        type: 'OUT',
        workSummary: workReport,
        locationAddress: 'Via WhatsApp'
    };

    record.punches.push(punchEntry);
    record.workSummary = workReport;
    await record.save();

    const workingMinutes = computeWorkingMinutes(record.punches, record.breaks || []);
    const hours = Math.floor(workingMinutes / 60);
    const mins = workingMinutes % 60;
    const workingStr = `${hours}h ${mins}m`;

    // Notify admin
    try {
        const timeStr = formatTimeIST(now);
        await Notification.create({
            user: employee.adminId,
            title: 'Employee Punched Out (WhatsApp)',
            message: `${employee.name} (${employee.employeeId || ''}) punched out via WhatsApp at ${timeStr} on ${formatDateNice(date)}. Total: ${workingStr}.\nWork Report: ${workReport}`,
            type: 'Attendance'
        });
    } catch (_) { /* Non-critical */ }

    return `Punched out successfully!\n\n` +
           `Name: ${employee.name}\n` +
           `Time: ${formatTimeIST(now)}\n` +
           `Date: ${formatDateNice(date)}\n` +
           `Total Working Time: ${workingStr}\n\n` +
           `Work Report:\n${workReport}\n\n` +
           `Have a great evening!`;
};

/** Handle PUNCH OUT request - asks for work report before punching out */
const handlePunchOut = async (employee, waPhone, text = '') => {
    const date = getTodayStr();

    const record = await Attendance.findOne({ employee: employee._id, date });
    if (!record || record.punches.length === 0) {
        return `You have not punched in yet today.\nSend *punch in* to start your attendance.`;
    }

    const lastPunch = record.punches[record.punches.length - 1];
    if (lastPunch.type === 'OUT') {
        return `You already punched out today at ${formatTimeIST(lastPunch.time)}.`;
    }

    // Check if the employee already provided work summary in the same message e.g. "punch out: fixed login bug"
    const directSummary = text.replace(/^(punch\s*out|checkout|check\s*out|sign\s*out|logout|log\s*out|out)[:\s-]*/i, '').trim();
    if (directSummary.length >= 5) {
        return await completePunchOut(employee, record, directSummary, waPhone);
    }

    // Otherwise, start multi-step session asking for daily work report
    await WhatsAppSession.findOneAndUpdate(
        { phone: waPhone },
        {
            phone: waPhone,
            flow: 'punch_out',
            step: 'awaiting_work_report',
            data: { date },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        },
        { upsert: true, new: true }
    );

    return `Please share your work report before punching out:\n\n` +
           `What work did you complete today? Reply with a summary of your tasks.\n\n` +
           `Send *cancel* to cancel punch out.`;
};

/** Handle WORK REPORT submission for Punch Out */
const handlePunchOutReport = async (employee, text, session, waPhone) => {
    const t = text.trim();

    if (t.toLowerCase() === 'cancel') {
        await WhatsAppSession.deleteOne({ phone: waPhone });
        return `Punch out cancelled. Send *punch out* when you are ready to submit your work report.`;
    }

    if (t.length < 3) {
        return `Please provide a valid work report describing what you completed today.\n\nSend *cancel* to cancel punch out.`;
    }

    const date = getTodayStr();
    const record = await Attendance.findOne({ employee: employee._id, date });

    if (!record || record.punches.length === 0) {
        await WhatsAppSession.deleteOne({ phone: waPhone });
        return `You have not punched in yet today.\nSend *punch in* to start your attendance.`;
    }

    const hasPunchedOut = record.punches.some(p => p.type === 'OUT');
    if (hasPunchedOut) {
        await WhatsAppSession.deleteOne({ phone: waPhone });
        const outPunch = record.punches.slice().reverse().find(p => p.type === 'OUT');
        return `You have already punched out for today at ${formatTimeIST(outPunch.time)}.`;
    }

    await WhatsAppSession.deleteOne({ phone: waPhone });
    return await completePunchOut(employee, record, t, waPhone);
};

// Helper to get all overlapping days of a range [fromDateStr, toDateStr] in a given year-month YYYY-MM
const getOverlappingDaysInMonth = (fromDateStr, toDateStr, leaveDuration, yearMonthStr) => {
    const monthStart = new Date(yearMonthStr + "-01");
    const [year, month] = yearMonthStr.split('-').map(Number);
    const monthEnd = new Date(year, month, 0);

    const reqStart = new Date(fromDateStr);
    const reqEnd = new Date(toDateStr);

    const overlapStart = new Date(Math.max(monthStart.getTime(), reqStart.getTime()));
    const overlapEnd = new Date(Math.min(monthEnd.getTime(), reqEnd.getTime()));

    if (overlapStart > overlapEnd) return 0;

    const diffMs = overlapEnd.getTime() - overlapStart.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    return leaveDuration === "Full Day" ? diffDays : 0.5;
};

/** Handle LEAVE BALANCE */
const handleLeaveBalance = async (employee) => {
    try {
        const user = await User.findById(employee._id).populate('leaveGroup');
        const entitlement = Number(user?.noOfPaidLeaves || user?.leaveGroup?.noOfPaidLeaves || 0);

        // Fetch approved leave requests
        const approvedRequests = await Request.find({
            employee: employee._id,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Paid'
        });

        let totalUsed = 0;
        approvedRequests.forEach(req => {
            const start = new Date(req.fromDate);
            const end = new Date(req.toDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (req.leaveDuration === "Full Day") {
                totalUsed += diffDays;
            } else {
                totalUsed += 0.5;
            }
        });

        const remainingTotal = Math.max(0, entitlement - totalUsed);
        const policyName = user?.leaveGroup?.leaveGroupName || 'Standard Leave Policy';

        // Current Month Calculations
        const now = new Date();
        const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const currentYearMonth = istNow.toISOString().substring(0, 7);
        const [cy, cm] = currentYearMonth.split('-').map(Number);
        const lastDay = new Date(cy, cm, 0).getDate();
        const calMonthStart = `${currentYearMonth}-01`;
        const calMonthEnd = `${currentYearMonth}-${String(lastDay).padStart(2, '0')}`;
        const monthName = istNow.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });

        let monthUsed = 0;
        approvedRequests.forEach(req => {
            if ((req.fromDate <= calMonthEnd) && (req.toDate >= calMonthStart)) {
                monthUsed += getOverlappingDaysInMonth(req.fromDate, req.toDate, req.leaveDuration, currentYearMonth);
            }
        });

        // Max usage per month from employee or policy
        const maxPerMonth = (user?.maxPLMonth && user.maxPLMonth > 0)
            ? user.maxPLMonth
            : (user?.leaveGroup?.maxUseInMonth !== null && user?.leaveGroup?.maxUseInMonth !== undefined
                ? user.leaveGroup.maxUseInMonth
                : null);

        let availableThisMonth = remainingTotal;
        if (maxPerMonth !== null && maxPerMonth !== undefined && maxPerMonth > 0) {
            availableThisMonth = Math.min(Math.max(0, maxPerMonth - monthUsed), remainingTotal);
        }

        let msg = `Leave Portfolio — ${user?.name || employee.name}\n`;
        msg += `─────────────────────\n`;
        msg += `Policy: ${policyName}\n`;
        msg += `Total Entitlement: ${entitlement.toFixed(2)} days\n`;
        msg += `Total Used: ${totalUsed.toFixed(2)} days\n`;
        msg += `Remaining Balance: ${remainingTotal.toFixed(2)} days\n`;
        msg += `─────────────────────\n`;
        msg += `Current Month (${monthName}):\n`;
        if (maxPerMonth !== null && maxPerMonth !== undefined && maxPerMonth > 0) {
            msg += `• Monthly Limit: ${maxPerMonth.toFixed(2)} days\n`;
        }
        msg += `• Used this Month: ${monthUsed.toFixed(2)} days\n`;
        msg += `• Available this Month: ${availableThisMonth.toFixed(2)} days\n`;
        msg += `─────────────────────\n`;
        msg += `Send *apply leave* to request time off.`;

        return msg;
    } catch (err) {
        console.error('[WhatsApp] handleLeaveBalance error:', err.message);
        return `Could not fetch your leave balance right now. Please try again later or contact HR.`;
    }
};

/** Handle ATTENDANCE STATUS for today */
const handleAttendanceStatus = async (employee) => {
    try {
        const date = getTodayStr();
        const record = await Attendance.findOne({ employee: employee._id, date });
        const shiftDuration = await getShiftDurationMinutes(employee._id, date);

        if (!record) {
            return `Your attendance for today (${formatDateNice(date)}) has not been recorded yet.\nSend *punch in* to start.`;
        }

        const lastPunch = record.punches[record.punches.length - 1];
        const isPunchedIn = lastPunch?.type === 'IN';
        const workingMinutes = computeWorkingMinutes(record.punches, record.breaks || []);
        const hours = Math.floor(workingMinutes / 60);
        const mins = workingMinutes % 60;

        const firstIn = record.punches.find(p => p.type === 'IN');
        const lastOut = [...record.punches].reverse().find(p => p.type === 'OUT');

        let msg = `Today's Attendance (${formatDateNice(date)})\n`;
        msg += `─────────────────────\n`;
        msg += `Status: ${record.status}\n`;
        if (firstIn) msg += `Punch In: ${formatTimeIST(firstIn.time)}\n`;
        if (lastOut) msg += `Punch Out: ${formatTimeIST(lastOut.time)}\n`;
        msg += `Working Time: ${hours}h ${mins}m\n`;
        msg += `Currently: ${isPunchedIn ? 'Punched In' : 'Punched Out'}\n`;
        msg += `─────────────────────\n`;
        msg += `Send *monthly attendance* for this month's summary.`;

        return msg;
    } catch (err) {
        console.error('[WhatsApp] handleAttendanceStatus error:', err.message);
        return `Could not fetch your attendance. Please try again.`;
    }
};

/** Handle MONTHLY ATTENDANCE report */
const handleMonthlyAttendance = async (employee, text) => {
    try {
        let targetMonthStr = parseMonthYearFromText(text);
        if (!targetMonthStr) {
            // Default to current month in IST
            const now = new Date();
            const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            targetMonthStr = ist.toISOString().split('T')[0].substring(0, 7);
        }

        const [y, m] = targetMonthStr.split('-').map(Number);
        const startDate = `${targetMonthStr}-01`;
        const daysInMonth = new Date(y, m, 0).getDate();
        const endDate = `${targetMonthStr}-${String(daysInMonth).padStart(2, '0')}`;
        const monthDisplay = new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

        const records = await Attendance.find({
            employee: employee._id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 });

        const holidays = await Holiday.find({
            adminId: employee.adminId || employee._id,
            status: 'Active',
            date: { $gte: startDate, $lte: endDate }
        });

        // Compute elapsed days if current month
        const now = new Date();
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const isCurrentMonth = ist.getFullYear() === y && (ist.getMonth() + 1) === m;
        const todayStr = ist.toISOString().split('T')[0];
        const elapsedDays = isCurrentMonth ? ist.getDate() : daysInMonth;

        let presentCount = 0;
        let halfDayCount = 0;
        let onLeaveCount = 0;
        let absentCount = 0;
        let totalWorkedMinutes = 0;
        let lateArrivals = 0;
        let latePenaltyTotal = 0;
        let earlyDepartures = 0;
        let earlyPenaltyTotal = 0;
        const missingPunches = [];

        records.forEach(r => {
            if (r.status === 'Present') presentCount++;
            else if (r.status === 'Half Day') halfDayCount++;
            else if (r.status === 'On Leave') onLeaveCount++;
            else if (r.status === 'Absent') absentCount++;

            const mins = computeWorkingMinutes(r.punches, r.breaks || []);
            totalWorkedMinutes += mins;

            if (r.lateInPenalty?.isLate || (r.lateInPenalty?.amount || 0) > 0) {
                lateArrivals++;
                latePenaltyTotal += r.lateInPenalty?.amount || 0;
            }
            if (r.earlyOutPenalty?.isEarly || (r.earlyOutPenalty?.amount || 0) > 0) {
                earlyDepartures++;
                earlyPenaltyTotal += r.earlyOutPenalty?.amount || 0;
            }

            // Missing punch: has IN but no OUT (skip today if today is still in progress)
            const hasIn = r.punches?.some(p => p.type === 'IN');
            const hasOut = r.punches?.some(p => p.type === 'OUT');
            if (hasIn && !hasOut && r.date !== todayStr) {
                missingPunches.push(r.date);
            }
        });

        const workedHours = Math.floor(totalWorkedMinutes / 60);
        const workedMins = totalWorkedMinutes % 60;
        const workedStr = `${workedHours}h ${workedMins}m`;

        const activeDays = presentCount + (halfDayCount * 0.5);
        const avgMins = activeDays > 0 ? Math.round(totalWorkedMinutes / activeDays) : 0;
        const avgStr = `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`;

        let msg = `Monthly Attendance Report — ${monthDisplay}\n`;
        msg += `─────────────────────\n`;
        msg += `Employee: ${employee.name} (${employee.employeeId || 'N/A'})\n`;
        msg += `Department: ${employee.department || 'N/A'}\n\n`;

        msg += `Days Summary:\n`;
        msg += `• Total Days in Month: ${daysInMonth}\n`;
        if (isCurrentMonth) {
            msg += `• Days Elapsed: ${elapsedDays}\n`;
        }
        msg += `• Present: ${presentCount} days\n`;
        if (halfDayCount > 0) msg += `• Half Day: ${halfDayCount} days\n`;
        if (onLeaveCount > 0) msg += `• On Leave: ${onLeaveCount} days\n`;
        if (absentCount > 0) msg += `• Absent: ${absentCount} days\n`;
        if (holidays.length > 0) msg += `• Paid Holidays: ${holidays.length} days\n`;

        msg += `\nWorking Hours:\n`;
        msg += `• Total Worked: ${workedStr}\n`;
        if (activeDays > 0) {
            msg += `• Daily Average: ${avgStr}\n`;
        }

        msg += `\nPenalties & Deviations:\n`;
        msg += `• Late Arrivals: ${lateArrivals}${latePenaltyTotal > 0 ? ` (Rs.${latePenaltyTotal.toLocaleString('en-IN')})` : ''}\n`;
        msg += `• Early Departures: ${earlyDepartures}${earlyPenaltyTotal > 0 ? ` (Rs.${earlyPenaltyTotal.toLocaleString('en-IN')})` : ''}\n`;
        msg += `• Missing Punches: ${missingPunches.length}\n`;
        if (missingPunches.length > 0) {
            msg += `• Missing Out Dates: ${missingPunches.slice(0, 4).join(', ')}${missingPunches.length > 4 ? '...' : ''}\n`;
        }

        msg += `─────────────────────\n`;
        msg += `Send *attendance* for today's status.\n`;
        msg += `Send *monthly attendance ${isCurrentMonth ? 'may 2026' : monthDisplay.toLowerCase()}* to check other months.`;

        return msg;
    } catch (err) {
        console.error('[WhatsApp] handleMonthlyAttendance error:', err);
        return `Could not generate your monthly attendance report. Please try again or contact HR.`;
    }
};

/** Handle SALARY SLIP request - generates and delivers actual PDF document */
const handleSalarySlip = async (employee, text, waPhone) => {
    try {
        let targetMonthStr = parseMonthYearFromText(text);

        // If month not specified, default to strict calendar previous month in IST
        if (!targetMonthStr) {
            const now = new Date();
            const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const prev = new Date(ist.getFullYear(), ist.getMonth() - 1, 1);
            targetMonthStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        }

        const payout = await Payout.findOne({
            employeeId: employee._id,
            month: targetMonthStr
        });

        // Only send if payout exists and status is Published
        if (!payout || payout.status !== 'Published') {
            const publishedPayouts = await Payout.find({ employeeId: employee._id, status: 'Published' })
                .sort({ month: -1 })
                .limit(6)
                .select('month');

            let msg = `Salary slip for ${targetMonthStr} is not published yet.\n\nPlease contact HR for further details.`;
            if (publishedPayouts && publishedPayouts.length > 0) {
                const monthsList = publishedPayouts.map(p => p.month).join(', ');
                msg += `\n\nAvailable published salary slips: ${monthsList}\n` +
                       `Try sending: *salary slip ${publishedPayouts[0].month}*`;
            }
            return msg;
        }

        // Generate actual PDF document for published payout
        const { buffer, filename } = await buildPayslipPdfBuffer(payout._id);

        const netPay = Math.round(payout.finalPayout || 0).toLocaleString('en-IN');

        // Send PDF document via WhatsApp Meta Cloud API
        if (waPhone) {
            await sendWhatsAppDocument(
                waPhone,
                buffer,
                filename,
                `Salary Slip for ${payout.month}`
            );
        }

        return `Salary Slip — ${payout.month}\n` +
               `─────────────────────\n` +
               `Employee: ${employee.name}\n` +
               `Employee ID: ${employee.employeeId || 'N/A'}\n` +
               `Department: ${employee.department || 'N/A'}\n` +
               `Net Pay: Rs.${netPay}\n` +
               `─────────────────────\n` +
               `Your PDF salary slip has been sent above.`;
    } catch (err) {
        console.error('[WhatsApp] handleSalarySlip error:', err);
        return `Could not generate your salary slip PDF. Please contact HR or try again later.`;
    }
};

/** Handle HELP */
const handleHelp = (employee) => {
    return `Hello *${employee.name}*!\n\n` +
        `Here are the available commands:\n\n` +
        `1. *punch in* — Record your arrival attendance\n` +
        `2. *punch out* — Record departure & submit work report\n` +
        `3. *attendance* — View today's attendance status\n` +
        `4. *monthly attendance* — View monthly attendance report\n` +
        `5. *balance* — Check remaining leave balance\n` +
        `6. *apply leave* — Apply for a leave\n` +
        `7. *salary slip* — Receive salary slip in PDF\n\n` +
        `*Tips:*\n` +
        `• Specific month: *monthly attendance may 2026*\n` +
        `• Specific salary slip: *salary slip june 2026*\n` +
        `• You can also simply reply with the number (*1* to *7*)\n\n` +
        `For any issues, please contact HR directly.`;
};

// ─────────────────────────────────────────────────────────────────
// MULTI-STEP LEAVE APPLICATION FLOW
// ─────────────────────────────────────────────────────────────────

/** Fetch available leave types for the employee */
const getAvailableLeaveTypes = async (employee) => {
    const leaveGroup = employee.leaveGroup;
    if (!leaveGroup || !leaveGroup.leaveTypes?.length) {
        // Fallback: fetch all leave types for the admin
        const types = await LeaveType.find({ adminId: employee.adminId }).select('name _id');
        return types.map(t => t.name);
    }
    return leaveGroup.leaveTypes.map(lt => lt.leaveTypeName).filter(Boolean);
};

/**
 * Handle multi-step leave application conversation.
 * Steps: awaiting_leave_type → awaiting_duration → awaiting_from_date → awaiting_to_date → awaiting_reason → confirm
 */
const handleLeaveFlow = async (employee, text, session, waPhone) => {
    const t = text.trim();

    // ── STEP 1: Ask for leave type ──
    if (!session || session.flow !== 'apply_leave') {
        const leaveTypes = await getAvailableLeaveTypes(employee);
        const typeList = leaveTypes.map((lt, i) => `${i + 1}. ${lt}`).join('\n');

        await WhatsAppSession.findOneAndUpdate(
            { phone: waPhone },
            {
                phone: waPhone,
                flow: 'apply_leave',
                step: 'awaiting_leave_type',
                data: { leaveTypes },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            },
            { upsert: true, new: true }
        );

        return `To apply for leave, please select the type:\n\n${typeList}\n\nReply with the number (e.g. *1*) or type the leave name.\n\nSend *cancel* to cancel.`;
    }

    // Cancel
    if (t.toLowerCase() === 'cancel') {
        await WhatsAppSession.deleteOne({ phone: waPhone });
        return `Leave application cancelled. Send *help* to see all commands.`;
    }

    const { step, data } = session;

    // ── STEP 2: Receive leave type ──
    if (step === 'awaiting_leave_type') {
        const leaveTypes = data.leaveTypes || [];
        let selectedType = null;

        // Check if numeric input
        const num = parseInt(t);
        if (!isNaN(num) && num >= 1 && num <= leaveTypes.length) {
            selectedType = leaveTypes[num - 1];
        } else {
            // Match by name (case-insensitive)
            selectedType = leaveTypes.find(lt => lt.toLowerCase().includes(t.toLowerCase()));
        }

        if (!selectedType) {
            return `Invalid selection. Please reply with a number from the list, e.g. *1*.`;
        }

        await WhatsAppSession.findOneAndUpdate(
            { phone: waPhone },
            {
                step: 'awaiting_duration',
                data: { ...data, leaveType: selectedType },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        );

        return `Leave type: *${selectedType}*\n\nIs this a full day or half day?\n1. Full Day\n2. Half Day\n\nReply with *1* or *2*.`;
    }

    // ── STEP 3: Receive duration ──
    if (step === 'awaiting_duration') {
        let duration = 'Full Day';
        if (t === '2' || t.toLowerCase().includes('half')) duration = 'Half Day';

        await WhatsAppSession.findOneAndUpdate(
            { phone: waPhone },
            {
                step: 'awaiting_from_date',
                data: { ...data, duration },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        );

        return `Duration: *${duration}*\n\nEnter the *from date* in DD-MM-YYYY format.\nExample: *15-09-2025*`;
    }

    // ── STEP 4: Receive from date ──
    if (step === 'awaiting_from_date') {
        const dateMatch = t.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (!dateMatch) {
            return `Invalid date format. Please use DD-MM-YYYY.\nExample: *15-09-2025*`;
        }
        const [, d, m, y] = dateMatch;
        const fromDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;

        if (data.duration === 'Half Day') {
            // Half day: no to-date needed
            await WhatsAppSession.findOneAndUpdate(
                { phone: waPhone },
                {
                    step: 'awaiting_reason',
                    data: { ...data, fromDate, toDate: fromDate },
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                }
            );
            return `From date: *${t}*\n\nPlease enter the *reason* for your leave:`;
        }

        await WhatsAppSession.findOneAndUpdate(
            { phone: waPhone },
            {
                step: 'awaiting_to_date',
                data: { ...data, fromDate },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        );

        return `From date: *${t}*\n\nEnter the *to date* in DD-MM-YYYY format:`;
    }

    // ── STEP 5: Receive to date ──
    if (step === 'awaiting_to_date') {
        const dateMatch = t.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (!dateMatch) {
            return `Invalid date format. Please use DD-MM-YYYY.\nExample: *20-09-2025*`;
        }
        const [, d, m, y] = dateMatch;
        const toDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;

        if (toDate < data.fromDate) {
            return `To date cannot be before from date. Please enter a valid to date:`;
        }

        await WhatsAppSession.findOneAndUpdate(
            { phone: waPhone },
            {
                step: 'awaiting_reason',
                data: { ...data, toDate },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        );

        return `To date: *${t}*\n\nPlease enter the *reason* for your leave:`;
    }

    // ── STEP 6: Receive reason, confirm ──
    if (step === 'awaiting_reason') {
        const reason = t;

        await WhatsAppSession.findOneAndUpdate(
            { phone: waPhone },
            {
                step: 'confirming',
                data: { ...data, reason },
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        );

        const [fy, fm, fd] = data.fromDate.split('-');
        const [ty, tm, td] = (data.toDate || data.fromDate).split('-');

        return `Please confirm your leave request:\n\n` +
            `Leave Type: ${data.leaveType}\n` +
            `Duration: ${data.duration}\n` +
            `From: ${fd}-${fm}-${fy}\n` +
            `To: ${td || fd}-${tm || fm}-${ty || fy}\n` +
            `Reason: ${reason}\n\n` +
            `Reply *yes* to confirm or *cancel* to cancel.`;
    }

    // ── STEP 7: Final confirmation ──
    if (step === 'confirming') {
        if (t.toLowerCase() !== 'yes') {
            await WhatsAppSession.deleteOne({ phone: waPhone });
            return `Leave application cancelled.`;
        }

        try {
            // Find leave type ID
            const leaveTypeDoc = await LeaveType.findOne({
                adminId: employee.adminId,
                name: { $regex: new RegExp(data.leaveType, 'i') }
            });

            const request = await Request.create({
                employee: employee._id,
                adminId: employee.adminId,
                requestType: 'Leave',
                leaveType: leaveTypeDoc?._id || null,
                leaveTypeName: data.leaveType,
                leaveDuration: data.duration,
                fromDate: data.fromDate,
                toDate: data.toDate || data.fromDate,
                date: data.fromDate,
                reason: data.reason,
                status: 'Pending',
                submittedVia: 'WhatsApp'
            });

            // Notify admin
            try {
                await Notification.create({
                    user: employee.adminId,
                    title: 'Leave Request (WhatsApp)',
                    message: `${employee.name} (${employee.employeeId || ''}) applied for ${data.leaveType} leave from ${data.fromDate} to ${data.toDate || data.fromDate} via WhatsApp. Reason: ${data.reason}`,
                    type: 'Leave'
                });
            } catch (_) { /* Non-critical */ }

            await WhatsAppSession.deleteOne({ phone: waPhone });

            return `Your leave request has been submitted successfully!\n\n` +
                `Leave Type: ${data.leaveType}\n` +
                `From: ${data.fromDate}\n` +
                `To: ${data.toDate || data.fromDate}\n` +
                `Status: Pending (Awaiting HR Approval)\n\n` +
                `You will be notified once HR approves or rejects your request.`;
        } catch (err) {
            console.error('[WhatsApp] Leave submission error:', err.message);
            await WhatsAppSession.deleteOne({ phone: waPhone });
            return `Failed to submit leave request. Please try again or contact HR directly.`;
        }
    }

    return null;
};

// ─────────────────────────────────────────────────────────────────
// MAIN WEBHOOK HANDLERS
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/whatsapp/webhook
 * Meta calls this to verify your webhook endpoint when you register it in the dashboard.
 */
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('[WhatsApp] Webhook verified successfully');
        return res.status(200).send(challenge);
    }

    console.warn('[WhatsApp] Webhook verification failed. Check WHATSAPP_VERIFY_TOKEN.');
    return res.sendStatus(403);
};

/**
 * POST /api/whatsapp/webhook
 * Meta sends all incoming employee messages here.
 * We parse, identify the employee, detect intent, and respond.
 */
export const handleWebhook = async (req, res) => {
    // Always return 200 immediately so Meta knows we received the message
    // All processing is async
    res.sendStatus(200);

    try {
        const body = req.body;

        // Validate it's a WhatsApp message event
        if (body?.object !== 'whatsapp_business_account') return;

        const entry = body?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const messages = value?.messages;

        if (!messages || messages.length === 0) return;

        for (const message of messages) {
            // Only handle text messages
            if (message.type !== 'text') {
                await sendWhatsAppMessage(
                    message.from,
                    `I can only process text messages right now.\n\nSend *help* to see available commands.`
                );
                continue;
            }

            const waPhone = message.from; // e.g. "919876543210"
            const text = message.text?.body?.trim() || '';

            console.log(`[WhatsApp] Message from ${waPhone}: "${text}"`);

            // ── Find which employee this phone number belongs to ──
            const employee = await findEmployeeByPhone(waPhone);

            if (!employee) {
                console.log(`[WhatsApp] Unregistered sender: ${waPhone}`);
                await sendWhatsAppMessage(
                    waPhone,
                    `Your phone number is not registered with HRMS.\n\nPlease contact HR or your administrator to register your mobile number.`
                );
                continue;
            }

            // ── Check for active multi-step session ──
            const session = await WhatsAppSession.findOne({ phone: waPhone });

            let reply;

            // If in a leave flow, continue it (unless they send a fresh command)
            if (session?.flow === 'apply_leave') {
                const intent = detectIntent(text);
                // Allow cancel and help to break out of flow
                if (intent === 'HELP') {
                    await WhatsAppSession.deleteOne({ phone: waPhone });
                    reply = handleHelp(employee);
                } else {
                    reply = await handleLeaveFlow(employee, text, session, waPhone);
                }
            } else if (session?.flow === 'punch_out') {
                const intent = detectIntent(text);
                if (intent === 'HELP') {
                    await WhatsAppSession.deleteOne({ phone: waPhone });
                    reply = handleHelp(employee);
                } else {
                    reply = await handlePunchOutReport(employee, text, session, waPhone);
                }
            } else {
                // Detect intent from fresh message
                const intent = detectIntent(text);

                switch (intent) {
                    case 'PUNCH_IN':
                        reply = await handlePunchIn(employee, waPhone);
                        break;
                    case 'PUNCH_OUT':
                        reply = await handlePunchOut(employee, waPhone, text);
                        break;
                    case 'LEAVE_BALANCE':
                        reply = await handleLeaveBalance(employee);
                        break;
                    case 'ATTENDANCE_STATUS':
                        reply = await handleAttendanceStatus(employee);
                        break;
                    case 'MONTHLY_ATTENDANCE':
                        reply = await handleMonthlyAttendance(employee, text);
                        break;
                    case 'SALARY_SLIP':
                        reply = await handleSalarySlip(employee, text, waPhone);
                        break;
                    case 'APPLY_LEAVE':
                        reply = await handleLeaveFlow(employee, text, null, waPhone);
                        break;
                    case 'HELP':
                        reply = handleHelp(employee);
                        break;
                    default:
                        reply = `I did not understand that.\n\nSend *help* to see all available commands.`;
                }
            }

            if (reply) {
                await sendWhatsAppMessage(waPhone, reply);
            }
        }
    } catch (err) {
        console.error('[WhatsApp] handleWebhook error:', err);
    }
};

/**
 * POST /api/whatsapp/send-test
 * Admin endpoint to test-send a WhatsApp message to any number.
 * Protected: only call from admin dashboard.
 */
export const sendTestMessage = async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, message: 'phone and message are required' });
        }

        await sendWhatsAppMessage(phone, message);

        return res.status(200).json({ success: true, message: `Test message sent to ${phone}` });
    } catch (err) {
        console.error('[WhatsApp] sendTestMessage error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to send test message', error: err.message });
    }
};
