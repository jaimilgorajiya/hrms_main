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
import LeaveType from '../models/LeaveType.Model.js';
import LeaveGroup from '../models/LeaveGroup.Model.js';
import Branch from '../models/Branch.Model.js';
import Notification from '../models/Notification.Model.js';
import WhatsAppSession from '../models/WhatsAppSession.Model.js';
import { getEmployeeShiftToday, getShiftDurationMinutes } from './Attendance.Controller.js';
import { computeWorkingMinutes } from '../utils/attendance.js';

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
        await axios.post(
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
    } catch (err) {
        console.error('[WhatsApp] Failed to send message:', err.response?.data || err.message);
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

    // Today's attendance status
    if (/\b(attendance|my\s*attendance|status|today)\b/.test(t)) return 'ATTENDANCE_STATUS';

    // Help
    if (/\b(help|commands|hi|hello|start|menu)\b/.test(t)) return 'HELP';

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

/** Handle PUNCH OUT */
const handlePunchOut = async (employee, waPhone) => {
    const date = getTodayStr();
    const now = new Date();

    const record = await Attendance.findOne({ employee: employee._id, date });
    if (!record || record.punches.length === 0) {
        return `You have not punched in yet today.\nSend *punch in* to start your attendance.`;
    }

    const lastPunch = record.punches[record.punches.length - 1];
    if (lastPunch.type === 'OUT') {
        return `You already punched out today at ${formatTimeIST(lastPunch.time)}.`;
    }

    const punchEntry = {
        time: now,
        type: 'OUT',
        locationAddress: 'Via WhatsApp'
    };

    record.punches.push(punchEntry);
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
            message: `${employee.name} (${employee.employeeId || ''}) punched out via WhatsApp at ${timeStr} on ${formatDateNice(date)}. Total: ${workingStr}.`,
            type: 'Attendance'
        });
    } catch (_) { /* Non-critical */ }

    return `Punched out successfully!\n\nName: ${employee.name}\nTime: ${formatTimeIST(now)}\nDate: ${formatDateNice(date)}\nTotal Working Time: ${workingStr}\n\nHave a great day!`;
};

/** Handle LEAVE BALANCE */
const handleLeaveBalance = async (employee) => {
    try {
        const leaveGroup = employee.leaveGroup;
        if (!leaveGroup || !leaveGroup.leaveTypes || leaveGroup.leaveTypes.length === 0) {
            return `No leave balance information is configured for your account yet. Please contact HR.`;
        }

        // Build balance summary
        const lines = leaveGroup.leaveTypes.map(lt => {
            const allocated = lt.daysAllotted || 0;
            const used = lt.daysUsed || 0;
            const remaining = Math.max(0, allocated - used);
            return `• ${lt.leaveTypeName}: ${remaining} days remaining (${used} used of ${allocated})`;
        });

        return `Your Leave Balance:\n\n${lines.join('\n')}\n\nSend *apply leave* to apply for leave.`;
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

        return msg;
    } catch (err) {
        console.error('[WhatsApp] handleAttendanceStatus error:', err.message);
        return `Could not fetch your attendance. Please try again.`;
    }
};

/** Handle SALARY SLIP request */
const handleSalarySlip = async (employee, text) => {
    try {
        // Try to extract month and year from text
        // e.g. "salary slip january 2025" or "salary slip 01 2025" or just "salary slip"
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        let targetMonth = null;
        let targetYear = null;

        // Try named month
        for (const mn of monthNames) {
            if (text.toLowerCase().includes(mn)) {
                targetMonth = monthNames.indexOf(mn) + 1;
                break;
            }
        }

        // Try year (4-digit)
        const yearMatch = text.match(/\b(20\d{2})\b/);
        if (yearMatch) targetYear = parseInt(yearMatch[1]);

        // Default to last month if not specified
        if (!targetMonth || !targetYear) {
            const now = new Date();
            const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            targetMonth = targetMonth || (last.getMonth() + 1);
            targetYear = targetYear || last.getFullYear();
        }

        const slip = await SalarySlip.findOne({
            employeeId: employee._id,
            month: targetMonth,
            year: targetYear
        });

        const monthStr = new Date(targetYear, targetMonth - 1, 1).toLocaleString('en-IN', { month: 'long' });

        if (!slip) {
            return `No salary slip found for ${monthStr} ${targetYear}.\n\nPlease contact HR if you believe this is an error.\n\nTip: Try *salary slip december 2024* to request a specific month.`;
        }

        // Format salary slip as a text summary (PDF sending requires media upload, we'll send summary)
        let msg = `Salary Slip — ${monthStr} ${targetYear}\n`;
        msg += `─────────────────────\n`;
        msg += `Employee: ${employee.name}\n`;
        msg += `Employee ID: ${employee.employeeId || 'N/A'}\n`;
        msg += `Department: ${employee.department || 'N/A'}\n`;
        msg += `\nEarnings:\n`;

        if (slip.earnings?.length > 0) {
            slip.earnings.forEach(e => {
                msg += `  ${e.componentName}: Rs.${e.calculatedAmount?.toLocaleString('en-IN') || 0}\n`;
            });
        }

        msg += `\nDeductions:\n`;
        if (slip.deductions?.length > 0) {
            slip.deductions.forEach(d => {
                msg += `  ${d.componentName}: Rs.${d.calculatedAmount?.toLocaleString('en-IN') || 0}\n`;
            });
        }

        const grossPay = slip.grossPay || slip.earnings?.reduce((s, e) => s + (e.calculatedAmount || 0), 0) || 0;
        const totalDeductions = slip.totalDeductions || slip.deductions?.reduce((s, d) => s + (d.calculatedAmount || 0), 0) || 0;
        const netPay = slip.finalPayout || slip.netPay || (grossPay - totalDeductions);

        msg += `\nGross Pay: Rs.${grossPay.toLocaleString('en-IN')}\n`;
        msg += `Total Deductions: Rs.${totalDeductions.toLocaleString('en-IN')}\n`;
        msg += `─────────────────────\n`;
        msg += `Net Pay: Rs.${netPay.toLocaleString('en-IN')}\n`;

        return msg;
    } catch (err) {
        console.error('[WhatsApp] handleSalarySlip error:', err.message);
        return `Could not fetch your salary slip. Please try again or contact HR.`;
    }
};

/** Handle HELP */
const handleHelp = (employee) => {
    return `Hello ${employee.name}! Here are the available commands:\n\n` +
        `*punch in* — Record your attendance when you arrive\n` +
        `*punch out* — Record your attendance when you leave\n` +
        `*attendance* — See today's attendance status\n` +
        `*balance* — Check your remaining leave balance\n` +
        `*apply leave* — Apply for a leave\n` +
        `*salary slip* — Get your last month's salary slip\n` +
        `*salary slip january 2025* — Get a specific month's salary slip\n\n` +
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
                // Silently ignore non-employees so Sendzyy's customers never receive unwanted HRMS bot messages
                console.log(`[WhatsApp] Ignored message from unregistered number: ${waPhone}`);
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
            } else {
                // Detect intent from fresh message
                const intent = detectIntent(text);

                switch (intent) {
                    case 'PUNCH_IN':
                        reply = await handlePunchIn(employee, waPhone);
                        break;
                    case 'PUNCH_OUT':
                        reply = await handlePunchOut(employee, waPhone);
                        break;
                    case 'LEAVE_BALANCE':
                        reply = await handleLeaveBalance(employee);
                        break;
                    case 'ATTENDANCE_STATUS':
                        reply = await handleAttendanceStatus(employee);
                        break;
                    case 'SALARY_SLIP':
                        reply = await handleSalarySlip(employee, text);
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
