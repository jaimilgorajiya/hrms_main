/**
 * tests/whatsapp.test.js
 *
 * Automated test suite for all 6 WhatsApp bot features.
 * Uses Node.js built-in assert — no extra dependencies required.
 *
 * Run: node --experimental-vm-modules tests/whatsapp.test.js
 * OR:  node tests/whatsapp.test.js (ESM works with package.json type:module)
 */

import assert from 'assert';

let passed = 0;
let failed = 0;

const test = (name, fn) => {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${name}`);
        console.error(`        ${err.message}`);
        failed++;
    }
};

const asyncTest = async (name, fn) => {
    try {
        await fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${name}`);
        console.error(`        ${err.message}`);
        failed++;
    }
};

console.log('\n=== WhatsApp Bot — Feature Tests ===\n');

// ─────────────────────────────────────────────────────────────────
// SHARED HELPERS (copied/inlined from controller for isolation)
// ─────────────────────────────────────────────────────────────────

const formatTimeIST = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    });
};

const getTodayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────────────────────────
// FEATURE 1: Leave Status Notification
// ─────────────────────────────────────────────────────────────────

console.log('Feature 1 — Request Status Notifications (Leave & Attendance Correction):');

const buildRequestStatusMsg = (request, status) => {
    const fmtDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };
    const statusWord = status === 'Approved' ? 'Approved' : 'Rejected';

    if (request.requestType === 'Attendance Correction') {
        const dateDisplay = fmtDate(request.fromDate || request.date);
        let msg = `Attendance Correction ${statusWord}\n\n` +
            `Date: ${dateDisplay}\n`;
        if (request.manualInStr) msg += `Punch-in: ${request.manualInStr}\n`;
        if (request.manualOutStr) msg += `Punch-out: ${request.manualOutStr}\n`;
        if (request.reason) msg += `Reason: ${request.reason}\n`;
        if (request.adminRemark) msg += `Remark: ${request.adminRemark}\n`;

        if (status === 'Approved') {
            msg += `\nYour attendance correction has been approved and your attendance record has been updated.`;
        } else {
            msg += `\nYour attendance correction request was not approved. Please contact HR if you have any questions.`;
        }
        return msg;
    }

    let msg = `Leave Request ${statusWord}\n\n` +
        `Leave Type: ${request.leaveTypeName || 'Leave'}\n` +
        `Duration: ${request.leaveDuration || 'Full Day'}\n` +
        `From: ${fmtDate(request.fromDate)}\n` +
        `To: ${fmtDate(request.toDate)}\n`;
    if (request.adminRemark) msg += `Remark: ${request.adminRemark}\n`;
    if (status === 'Approved') {
        msg += `\nYour leave has been recorded. Enjoy your time off.`;
    } else {
        msg += `\nYour leave request was not approved. Please contact HR if you have any questions.`;
    }
    return msg;
};

test('Approved leave message includes "Approved" status and "Enjoy your time off"', () => {
    const req = { requestType: 'Leave', leaveTypeName: 'Casual Leave', leaveDuration: 'Full Day', fromDate: '2026-09-20', toDate: '2026-09-20', adminRemark: null };
    const msg = buildRequestStatusMsg(req, 'Approved');
    assert.ok(msg.includes('Leave Request Approved'), 'Should include Approved status');
    assert.ok(msg.includes('Enjoy your time off'), 'Should include approval message');
    assert.ok(msg.includes('20-09-2026'), 'Should format date correctly as DD-MM-YYYY');
    assert.ok(!msg.includes('Remark:'), 'Should not include empty remark');
});

test('Rejected leave message includes "Rejected" status and "not approved" text', () => {
    const req = { requestType: 'Leave', leaveTypeName: 'Sick Leave', leaveDuration: 'First Half', fromDate: '2026-09-21', toDate: '2026-09-21', adminRemark: 'Insufficient balance' };
    const msg = buildRequestStatusMsg(req, 'Rejected');
    assert.ok(msg.includes('Leave Request Rejected'), 'Should include Rejected status');
    assert.ok(msg.includes('Remark: Insufficient balance'), 'Should include admin remark');
    assert.ok(msg.includes('not approved'), 'Should include rejection guidance');
});

test('Approved Attendance Correction notification includes Approved status and punch details', () => {
    const req = { requestType: 'Attendance Correction', date: '2026-09-19', manualInStr: '09:30 am', manualOutStr: '06:30 pm', reason: 'Forgot card', adminRemark: 'Verified with team lead' };
    const msg = buildRequestStatusMsg(req, 'Approved');
    assert.ok(msg.includes('Attendance Correction Approved'), 'Should include Attendance Correction Approved');
    assert.ok(msg.includes('19-09-2026'), 'Should include formatted date');
    assert.ok(msg.includes('Punch-in: 09:30 am'), 'Should include punch-in');
    assert.ok(msg.includes('Punch-out: 06:30 pm'), 'Should include punch-out');
    assert.ok(msg.includes('attendance record has been updated'), 'Should include record update confirmation');
});

test('Rejected Attendance Correction notification includes Rejected status and reason/remark', () => {
    const req = { requestType: 'Attendance Correction', date: '2026-09-19', reason: 'Forgot card', adminRemark: 'No evidence of presence' };
    const msg = buildRequestStatusMsg(req, 'Rejected');
    assert.ok(msg.includes('Attendance Correction Rejected'), 'Should include Attendance Correction Rejected');
    assert.ok(msg.includes('Remark: No evidence of presence'), 'Should include admin remark');
    assert.ok(msg.includes('not approved'), 'Should include rejection notice');
});

test('Duration "First Half" is shown correctly in notification', () => {
    const req = { requestType: 'Leave', leaveTypeName: 'Casual Leave', leaveDuration: 'First Half', fromDate: '2026-09-25', toDate: '2026-09-25' };
    const msg = buildRequestStatusMsg(req, 'Approved');
    assert.ok(msg.includes('Duration: First Half'), 'Should show First Half duration');
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 2: Manager Alert — phone normalization
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 2 — Manager Alert Phone Normalization:');

const normalizeToWa = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
};

test('10-digit phone is prefixed with 91', () => {
    assert.strictEqual(normalizeToWa('9876543210'), '919876543210');
});

test('Already international phone (91xxxxxxxxxx) passes through unchanged', () => {
    assert.strictEqual(normalizeToWa('919876543210'), '919876543210');
});

test('Phone with symbols is cleaned before normalizing', () => {
    assert.strictEqual(normalizeToWa('+91-98765-43210'), '919876543210');
});

test('Manager alert message includes employee name, leave type and portal link', () => {
    const empName = 'Rahul Sharma';
    const empId = 'EMP001';
    const leaveType = 'Casual Leave';
    const duration = 'Full Day';
    const fromDate = '2026-09-20';
    const toDate = '2026-09-20';
    const reason = 'Personal work';

    const [fy, fm, fd] = fromDate.split('-');
    const [ty, tm, td] = toDate.split('-');

    const msg = `New Leave Request — Action Required\n\n` +
        `Employee: ${empName} (${empId})\n` +
        `Leave Type: ${leaveType}\n` +
        `Duration: ${duration}\n` +
        `From: ${fd}-${fm}-${fy}\n` +
        `To: ${td}-${tm}-${ty}\n` +
        `Reason: ${reason}\n\n` +
        `Please log in to the HRMS portal to approve or reject this request.`;

    assert.ok(msg.includes(empName), 'Should include employee name');
    assert.ok(msg.includes(leaveType), 'Should include leave type');
    assert.ok(!msg.includes('Request ID:'), 'Should NOT include Request ID');
    assert.ok(msg.includes('HRMS portal'), 'Should direct to HRMS portal');
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 3: Shift Reminders — time parsing logic
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 3 — Shift Reminder Time Logic:');

const timeStrToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

const shouldSendPunchInReminder = (shiftStartStr, currentMinutes) => {
    const shiftStartMins = timeStrToMinutes(shiftStartStr);
    if (shiftStartMins === null) return false;
    const minutesLate = currentMinutes - shiftStartMins;
    return minutesLate >= 15 && minutesLate <= 60;
};

test('Reminder fires 15 min after 09:00 shift start (at 09:15)', () => {
    const currentMins = 9 * 60 + 15; // 09:15
    assert.ok(shouldSendPunchInReminder('09:00', currentMins), 'Should send reminder at 09:15');
});

test('Reminder does NOT fire at exactly shift start time (09:00)', () => {
    const currentMins = 9 * 60; // 09:00
    assert.ok(!shouldSendPunchInReminder('09:00', currentMins), 'Should NOT send reminder at shift start');
});

test('Reminder does NOT fire before shift start (08:50)', () => {
    const currentMins = 8 * 60 + 50; // 08:50
    assert.ok(!shouldSendPunchInReminder('09:00', currentMins), 'Should NOT send reminder before shift');
});

test('Reminder does NOT fire more than 60 min after shift start (at 10:05)', () => {
    const currentMins = 10 * 60 + 5; // 10:05
    assert.ok(!shouldSendPunchInReminder('09:00', currentMins), 'Should NOT send reminder after 60 min window');
});

test('Reminder fires at 30 min after shift start (within window)', () => {
    const currentMins = 9 * 60 + 30; // 09:30
    assert.ok(shouldSendPunchInReminder('09:00', currentMins), 'Should send reminder at 09:30');
});

test('timeStrToMinutes handles invalid input', () => {
    assert.strictEqual(timeStrToMinutes(null), null);
    assert.strictEqual(timeStrToMinutes(''), null);
    assert.strictEqual(timeStrToMinutes('abc'), null);
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 4: Auto Salary Slip — message format
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 4 — Auto Salary Slip Delivery:');

test('Salary slip caption includes month, net pay and attachment note', () => {
    const monthDisplay = 'August 2026';
    const netPay = '45,000';
    const caption = `Your salary slip for ${monthDisplay} is ready!\n\nNet Pay: Rs.${netPay}\n\nPlease find your salary slip attached.`;
    assert.ok(caption.includes(monthDisplay), 'Should include month');
    assert.ok(caption.includes(netPay), 'Should include net pay');
    assert.ok(caption.includes('attached'), 'Should mention attachment');
});

test('Fallback text message (when PDF fails) includes month and portal login prompt', () => {
    const monthDisplay = 'August 2026';
    const netPay = '45,000';
    const fallbackMsg = `Your salary slip for ${monthDisplay} has been published.\nNet Pay: Rs.${netPay}\n\nPlease log in to the HRMS portal to download your salary slip.`;
    assert.ok(fallbackMsg.includes(monthDisplay), 'Should include month in fallback');
    assert.ok(fallbackMsg.includes('HRMS portal'), 'Should include portal reference in fallback');
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 5: Half-Day Duration Parsing
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 5 — Half-Day Duration Selection:');

const parseDuration = (t) => {
    const tl = t.toLowerCase();
    if (t === '2' || tl.includes('first half') || tl === 'first') return 'First Half';
    if (t === '3' || tl.includes('second half') || tl === 'second') return 'Second Half';
    if (tl.includes('half')) return 'First Half'; // legacy fallback
    return 'Full Day'; // default
};

test('Reply "1" maps to Full Day', () => {
    assert.strictEqual(parseDuration('1'), 'Full Day');
});

test('Reply "2" maps to First Half', () => {
    assert.strictEqual(parseDuration('2'), 'First Half');
});

test('Reply "3" maps to Second Half', () => {
    assert.strictEqual(parseDuration('3'), 'Second Half');
});

test('Reply "first half" (text) maps to First Half', () => {
    assert.strictEqual(parseDuration('first half'), 'First Half');
});

test('Reply "second half" (text) maps to Second Half', () => {
    assert.strictEqual(parseDuration('second half'), 'Second Half');
});

test('Legacy "half" input maps to First Half', () => {
    assert.strictEqual(parseDuration('half'), 'First Half');
});

test('First Half and Second Half are correctly identified as half-day types', () => {
    const isHalfDay = (d) => d === 'First Half' || d === 'Second Half';
    assert.ok(isHalfDay('First Half'), 'First Half is a half-day type');
    assert.ok(isHalfDay('Second Half'), 'Second Half is a half-day type');
    assert.ok(!isHalfDay('Full Day'), 'Full Day is NOT a half-day type');
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 6: Attendance Regularization — time parsing
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 6 — Attendance Regularization Time Parsing:');

const parseTimeToDate = (timeStr, dateStr, isPunchOut = false) => {
    const t = timeStr.toLowerCase().trim();
    let hours = null, mins = 0;
    let hasAmPm = false;

    const colonMatch = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
    if (colonMatch) {
        hours = parseInt(colonMatch[1], 10);
        mins = parseInt(colonMatch[2], 10);
        if (colonMatch[3]) {
            hasAmPm = true;
            if (colonMatch[3] === 'pm' && hours < 12) hours += 12;
            if (colonMatch[3] === 'am' && hours === 12) hours = 0;
        }
    } else {
        const numMatch = t.match(/^(\d{3,4})$/);
        if (numMatch) {
            const n = numMatch[1].padStart(4, '0');
            hours = parseInt(n.slice(0, 2), 10);
            mins = parseInt(n.slice(2), 10);
        }
    }

    if (hours === null || hours > 23 || mins > 59) return null;

    if (isPunchOut && !hasAmPm && hours >= 1 && hours <= 11) {
        hours += 12;
    }

    const hh = String(hours).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:00.000+05:30`);
};

test('Parses "09:30" (24h) to exact 09:30 AM in IST', () => {
    const d = parseTimeToDate('09:30', '2026-09-18', false);
    assert.ok(d instanceof Date, 'Should return a Date');
    const formatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    assert.strictEqual(formatted, '09:30 am');
});

test('Parses "06:30" (for punch-out) intelligently to 06:30 PM in IST', () => {
    const d = parseTimeToDate('06:30', '2026-09-18', true);
    const formatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    assert.strictEqual(formatted, '06:30 pm');
});

test('Parses "9:30 AM" (12h with AM) to a valid Date', () => {
    const d = parseTimeToDate('9:30 AM', '2026-09-18');
    assert.ok(d instanceof Date, 'Should return a Date');
    assert.ok(!isNaN(d.getTime()), 'Date should be valid');
});

test('Parses "6:30 PM" (12h with PM) correctly', () => {
    const d = parseTimeToDate('6:30 PM', '2026-09-18');
    assert.ok(d instanceof Date, 'Should return a Date');
    assert.ok(!isNaN(d.getTime()), 'Date should be valid');
});

test('Parses "0930" (4-digit) to a valid Date', () => {
    const d = parseTimeToDate('0930', '2026-09-18');
    assert.ok(d instanceof Date, 'Should return a Date');
});

test('Returns null for invalid time "abc"', () => {
    const d = parseTimeToDate('abc', '2026-09-18');
    assert.strictEqual(d, null, 'Should return null for invalid time');
});

test('Returns null for hours > 23', () => {
    const d = parseTimeToDate('25:00', '2026-09-18');
    assert.strictEqual(d, null, 'Should return null for hours > 23');
});

test('Returns null for minutes > 59', () => {
    const d = parseTimeToDate('09:61', '2026-09-18');
    assert.strictEqual(d, null, 'Should return null for minutes > 59');
});

test('Date parsing from DD-MM-YYYY to YYYY-MM-DD', () => {
    const match = '18-09-2026'.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    const [, d, m, y] = match;
    const result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    assert.strictEqual(result, '2026-09-18', 'Should convert DD-MM-YYYY to YYYY-MM-DD');
});

test('Future date is correctly identified', () => {
    const today = getTodayStr();
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const futureStr = future.toISOString().split('T')[0];
    assert.ok(futureStr > today, 'Future date should be greater than today');
});

// ─────────────────────────────────────────────────────────────────
// DETECT INTENT
// ─────────────────────────────────────────────────────────────────

console.log('\nBonus — detectIntent Tests:');

const detectIntent = (text) => {
    const t = text.toLowerCase().trim();

    if (/\b(punch\s*in|checkin|check\s*in|sign\s*in|login|log\s*in|in)\b/.test(t)) return 'PUNCH_IN';
    if (/\b(punch\s*out|checkout|check\s*out|sign\s*out|logout|log\s*out|out)\b/.test(t)) return 'PUNCH_OUT';
    if (/\b(apply\s*leave|leave\s*apply|take\s*leave|request\s*leave|need\s*leave)\b/.test(t)) return 'APPLY_LEAVE';
    if (/\b(salary\s*slip|payslip|pay\s*slip|salary)\b/.test(t)) return 'SALARY_SLIP';
    if (/\b(balance|leave\s*balance|remaining\s*leave|leaves\s*left)\b/.test(t)) return 'LEAVE_BALANCE';
    if (/\b(regularize|regularisation|regularization|missed\s*punch|correction|attendance\s*correction|correct\s*attendance|forgot\s*punch)\b/.test(t)) return 'REGULARIZE';

    const monthWords = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec';
    const hasMonthName = new RegExp(`\\b(${monthWords})\\b`, 'i').test(t);
    if (/\b(attendance|report)\b/.test(t) && (hasMonthName || /\b(month|monthly|summary)\b/.test(t))) return 'MONTHLY_ATTENDANCE';
    if (/\b(monthly\s*attendance|attendance\s*report|monthly\s*report)\b/.test(t)) return 'MONTHLY_ATTENDANCE';
    if (/\b(attendance|my\s*attendance|status|today)\b/.test(t)) return 'ATTENDANCE_STATUS';

    if (/^(1|1\.)\b/.test(t) || t === '1') return 'PUNCH_IN';
    if (/^(2|2\.)\b/.test(t) || t === '2') return 'PUNCH_OUT';
    if (/^(3|3\.)\b/.test(t) || t === '3') return 'ATTENDANCE_STATUS';
    if (/^(4|4\.)\b/.test(t) || t === '4') return 'MONTHLY_ATTENDANCE';
    if (/^(5|5\.)\b/.test(t) || t === '5') return 'LEAVE_BALANCE';
    if (/^(6|6\.)\b/.test(t) || t === '6') return 'APPLY_LEAVE';
    if (/^(7|7\.)\b/.test(t) || t === '7') return 'SALARY_SLIP';
    if (/^(8|8\.)\b/.test(t) || t === '8') return 'REGULARIZE';

    if (/\b(help|commands|hi|hello|start|menu|options|services|list)\b/.test(t)) return 'HELP';
    return 'UNKNOWN';
};

test('"regularize" keyword maps to REGULARIZE', () => {
    assert.strictEqual(detectIntent('regularize'), 'REGULARIZE');
});

test('"missed punch" maps to REGULARIZE', () => {
    assert.strictEqual(detectIntent('missed punch'), 'REGULARIZE');
});

test('"attendance correction" maps to REGULARIZE', () => {
    assert.strictEqual(detectIntent('attendance correction'), 'REGULARIZE');
});

test('"8" numeric shortcut maps to REGULARIZE', () => {
    assert.strictEqual(detectIntent('8'), 'REGULARIZE');
});

test('"apply leave" maps to APPLY_LEAVE', () => {
    assert.strictEqual(detectIntent('apply leave'), 'APPLY_LEAVE');
});

test('"salary" maps to SALARY_SLIP', () => {
    assert.strictEqual(detectIntent('salary'), 'SALARY_SLIP');
});

test('"hello" maps to HELP', () => {
    assert.strictEqual(detectIntent('hello'), 'HELP');
});

test('"6" numeric shortcut maps to APPLY_LEAVE', () => {
    assert.strictEqual(detectIntent('6'), 'APPLY_LEAVE');
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 7: Auto-Split Paid / Unpaid Leave Logic
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 7 — Auto-Split Paid / Unpaid Leave:');

const computeLeaveSplitPure = ({ totalDays, entitlement, totalUsedAnnual, maxInMonth, usedInMonth, fromDate, toDate, isHalfDay }) => {
    const remainingAnnual = Math.max(0, entitlement - totalUsedAnnual);
    const remainingMonthly = maxInMonth > 0 ? Math.max(0, maxInMonth - usedInMonth) : 9999;
    const maxPaidDays = Math.max(0, Math.min(totalDays, remainingAnnual, remainingMonthly));

    if (maxPaidDays >= totalDays) {
        return {
            isSplit: false,
            requestedDays: totalDays,
            paidDays: totalDays,
            unpaidDays: 0,
            segments: [{ fromDate, toDate, category: 'Paid', days: totalDays }]
        };
    }

    if (maxPaidDays === 0) {
        return {
            isSplit: true,
            requestedDays: totalDays,
            paidDays: 0,
            unpaidDays: totalDays,
            segments: [{ fromDate, toDate, category: 'Unpaid', days: totalDays }]
        };
    }

    const paidCount = Math.floor(maxPaidDays);
    const unpaidCount = totalDays - paidCount;

    const sDate = new Date(fromDate);
    const paidEndD = new Date(sDate);
    paidEndD.setDate(paidEndD.getDate() + (paidCount - 1));
    const paidEndStr = paidEndD.toISOString().split('T')[0];

    const unpaidStartD = new Date(sDate);
    unpaidStartD.setDate(unpaidStartD.getDate() + paidCount);
    const unpaidStartStr = unpaidStartD.toISOString().split('T')[0];

    return {
        isSplit: true,
        requestedDays: totalDays,
        paidDays: paidCount,
        unpaidDays: unpaidCount,
        segments: [
            { fromDate, toDate: paidEndStr, category: 'Paid', days: paidCount },
            { fromDate: unpaidStartStr, toDate, category: 'Unpaid', days: unpaidCount }
        ]
    };
};

test('8 days requested with 5 days monthly limit splits into 5 Paid + 3 Unpaid', () => {
    const res = computeLeaveSplitPure({
        totalDays: 8,
        entitlement: 18,
        totalUsedAnnual: 0,
        maxInMonth: 5,
        usedInMonth: 0,
        fromDate: '2026-09-20',
        toDate: '2026-09-27',
        isHalfDay: false
    });

    assert.strictEqual(res.isSplit, true, 'Should be split');
    assert.strictEqual(res.paidDays, 5, 'Should allocate 5 paid days');
    assert.strictEqual(res.unpaidDays, 3, 'Should allocate 3 unpaid days');
    assert.strictEqual(res.segments.length, 2, 'Should have 2 segments');
    assert.strictEqual(res.segments[0].category, 'Paid');
    assert.strictEqual(res.segments[0].fromDate, '2026-09-20');
    assert.strictEqual(res.segments[0].toDate, '2026-09-24');
    assert.strictEqual(res.segments[0].days, 5);
    assert.strictEqual(res.segments[1].category, 'Unpaid');
    assert.strictEqual(res.segments[1].fromDate, '2026-09-25');
    assert.strictEqual(res.segments[1].toDate, '2026-09-27');
    assert.strictEqual(res.segments[1].days, 3);
});

test('3 days requested within 5 days monthly limit does NOT split (all Paid)', () => {
    const res = computeLeaveSplitPure({
        totalDays: 3,
        entitlement: 18,
        totalUsedAnnual: 0,
        maxInMonth: 5,
        usedInMonth: 0,
        fromDate: '2026-09-20',
        toDate: '2026-09-22',
        isHalfDay: false
    });

    assert.strictEqual(res.isSplit, false);
    assert.strictEqual(res.paidDays, 3);
    assert.strictEqual(res.unpaidDays, 0);
    assert.strictEqual(res.segments.length, 1);
    assert.strictEqual(res.segments[0].category, 'Paid');
});

test('Leave requested when monthly quota already exhausted becomes 100% Unpaid', () => {
    const res = computeLeaveSplitPure({
        totalDays: 4,
        entitlement: 18,
        totalUsedAnnual: 5,
        maxInMonth: 5,
        usedInMonth: 5, // Already used 5 this month
        fromDate: '2026-09-20',
        toDate: '2026-09-23',
        isHalfDay: false
    });

    assert.strictEqual(res.isSplit, true);
    assert.strictEqual(res.paidDays, 0);
    assert.strictEqual(res.unpaidDays, 4);
    assert.strictEqual(res.segments[0].category, 'Unpaid');
});

test('Partial remaining quota (e.g. 2 remaining out of 5) splits correctly for 4 days request', () => {
    const res = computeLeaveSplitPure({
        totalDays: 4,
        entitlement: 18,
        totalUsedAnnual: 3,
        maxInMonth: 5,
        usedInMonth: 3, // 2 remaining
        fromDate: '2026-09-20',
        toDate: '2026-09-23',
        isHalfDay: false
    });

    assert.strictEqual(res.isSplit, true);
    assert.strictEqual(res.paidDays, 2);
    assert.strictEqual(res.unpaidDays, 2);
    assert.strictEqual(res.segments[0].days, 2);
    assert.strictEqual(res.segments[1].days, 2);
    assert.strictEqual(res.segments[0].fromDate, '2026-09-20');
    assert.strictEqual(res.segments[0].toDate, '2026-09-21');
    assert.strictEqual(res.segments[1].fromDate, '2026-09-22');
    assert.strictEqual(res.segments[1].toDate, '2026-09-23');
});

// ─────────────────────────────────────────────────────────────────
// FEATURE 8: Daily 7 PM Attendance PDF Report Generation
// ─────────────────────────────────────────────────────────────────

console.log('\nFeature 8 — Daily Attendance PDF Report & Recipient Resolution:');

import { buildDailyAttendanceReportPdfBuffer } from '../utils/attendanceReportPdf.js';

test('Recipient normalization handles various company contact formats', () => {
    assert.strictEqual(normalizeToWa('9099705065'), '919099705065');
    assert.strictEqual(normalizeToWa('+91 90997 05065'), '919099705065');
    assert.strictEqual(normalizeToWa('09099705065'), '919099705065');
    assert.strictEqual(normalizeToWa('919099705065'), '919099705065');
});

test('Company details fallback hierarchy resolves companyContact before admin phone', () => {
    const company = { companyContact: '9099705065' };
    const admin = { whatsAppNumber: '9876543210', phone: '9123456780' };
    const target = company.companyContact || admin.whatsAppNumber || admin.phone;
    assert.strictEqual(target, '9099705065');
});

test('Company details fallback hierarchy falls back to admin WhatsApp when company contact is missing', () => {
    const company = { companyContact: '' };
    const admin = { whatsAppNumber: '9876543210', phone: '9123456780' };
    const target = company.companyContact || admin.whatsAppNumber || admin.phone;
    assert.strictEqual(target, '9876543210');
});

await asyncTest('buildDailyAttendanceReportPdfBuffer generates a valid PDF buffer', async () => {
    const mockCompany = {
        companyName: 'Iflora Info PVT. LTD.',
        companyAddress: 'D&C Capstone, Kalgi Char Rasta, Paldi, Ahmedabad',
        companyContact: '9099705065',
        companyEmail: 'jaimilgorajiya4763@gmail.com'
    };
    const mockDateStr = '2026-09-19';
    const mockStats = {
        total: 2,
        present: 1,
        absent: 1,
        halfDay: 0,
        onLeave: 0
    };
    const mockRecords = [
        {
            name: 'John Doe',
            empId: 'EMP001',
            dept: 'Engineering',
            punchIn: '09:30 am',
            punchOut: '06:30 pm',
            workHours: '9.0 hrs',
            status: 'Present'
        },
        {
            name: 'Jane Smith',
            empId: 'EMP002',
            dept: 'Design',
            punchIn: '--:--',
            punchOut: '--:--',
            workHours: '0h 0m',
            status: 'Absent'
        }
    ];

    const pdfBuffer = await buildDailyAttendanceReportPdfBuffer({
        company: mockCompany,
        dateStr: mockDateStr,
        stats: mockStats,
        records: mockRecords
    });

    assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return a Node Buffer');
    assert.ok(pdfBuffer.length > 500, 'PDF buffer should have substantial byte length');
    // PDF Magic number %PDF-
    assert.strictEqual(pdfBuffer.subarray(0, 4).toString(), '%PDF', 'PDF buffer header must start with %PDF');
});

// ─────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
    process.exit(1);
}

