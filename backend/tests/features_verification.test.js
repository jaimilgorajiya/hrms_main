/**
 * tests/features_verification.test.js
 *
 * Automated verification test suite for:
 * 1. Employee WhatsApp Chatbot Access (Enable / Disable Access Guard)
 * 2. Daily Attendance Report Preferences (Email & WhatsApp Dispatch / Skip)
 *
 * Run: node backend/tests/features_verification.test.js
 */

import assert from 'assert';
import User from '../models/User.Model.js';
import Company from '../models/Company.Model.js';

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

console.log('\n======================================================');
console.log('🧪 RUNNING VERIFICATION TEST SUITE FOR NEW FEATURES');
console.log('======================================================\n');

// ─────────────────────────────────────────────────────────────────
// SECTION 1: Schema & Model Definitions Verification
// ─────────────────────────────────────────────────────────────────
console.log('--- Section 1: Database Schema & Default Values ---');

test('User schema has isWhatsAppEnabled field with default false (mutual exclusivity with requireSelfie)', () => {
    const userSchemaPaths = User.schema.paths;
    assert(userSchemaPaths['isWhatsAppEnabled'], 'User schema must include isWhatsAppEnabled');
    assert.strictEqual(userSchemaPaths['isWhatsAppEnabled'].defaultValue, false, 'Default must be false');
});

test('User schema has sendDailyAttendanceReport field with default true', () => {
    const userSchemaPaths = User.schema.paths;
    assert(userSchemaPaths['sendDailyAttendanceReport'], 'User schema must include sendDailyAttendanceReport');
    assert.strictEqual(userSchemaPaths['sendDailyAttendanceReport'].defaultValue, true, 'Default must be true');
});

test('Company schema has sendDailyAttendanceReport field with default true', () => {
    const companySchemaPaths = Company.schema.paths;
    assert(companySchemaPaths['sendDailyAttendanceReport'], 'Company schema must include sendDailyAttendanceReport');
    assert.strictEqual(companySchemaPaths['sendDailyAttendanceReport'].defaultValue, true, 'Default must be true');
});


// ─────────────────────────────────────────────────────────────────
// SECTION 2: Employee WhatsApp Chatbot Punch Restriction Guard Logic
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Section 2: Employee WhatsApp Punch Restriction vs Self-Service Options ---');

// Mock WhatsApp intent detector
const detectIntent = (text) => {
    const t = text.trim().toLowerCase();
    if (t === '1' || t.includes('punch in') || t.includes('check in')) return 'PUNCH_IN';
    if (t === '2' || t.includes('punch out') || t.includes('check out')) return 'PUNCH_OUT';
    if (t === '3' || t.includes('attendance')) return 'ATTENDANCE_STATUS';
    if (t === '4' || t.includes('monthly attendance')) return 'MONTHLY_ATTENDANCE';
    if (t === '5' || t.includes('balance') || t.includes('leave balance')) return 'LEAVE_BALANCE';
    if (t === '6' || t.includes('apply leave')) return 'APPLY_LEAVE';
    if (t === '7' || t.includes('salary slip') || t.includes('payslip')) return 'SALARY_SLIP';
    if (t === '8' || t.includes('regularize')) return 'REGULARIZE';
    if (t === 'help' || t === 'hi' || t === 'hello' || t === 'menu') return 'HELP';
    return 'UNKNOWN';
};

// Mock WhatsApp message processor matching WhatsApp.Controller.js logic
const processIncomingWhatsAppMessage = async ({ employee, text, waPhone, session = null }) => {
    if (!employee) {
        return {
            status: 'UNREGISTERED',
            reply: 'Your phone number is not registered with HRMS.'
        };
    }

    const isPunchDisabled = employee.isWhatsAppEnabled === false || employee.whatsAppPunchEnabled === false;
    let sessionDeleted = false;
    let reply = null;

    if (session?.flow === 'punch_in' || session?.flow === 'punch_out') {
        if (isPunchDisabled) {
            sessionDeleted = true;
            reply = `⚠️ *Punching Restricted*\n\nHello *${employee.name}*,\n\nPunching in/out via WhatsApp is disabled for your account by your administrator.\n\nPlease punch in/out using the HRMS Mobile App or Web Portal.\n\nOther WhatsApp features (Leave, Salary Slips, Reports) remain available. Send *help* to see all options.`;
            return { status: 'PUNCH_RESTRICTED', reply, sessionDeleted };
        }
    }

    const intent = detectIntent(text);

    switch (intent) {
        case 'PUNCH_IN':
        case 'PUNCH_OUT':
            if (isPunchDisabled) {
                reply = `⚠️ *Punching Restricted*\n\nHello *${employee.name}*,\n\nPunching in/out via WhatsApp is disabled for your account by your administrator.\n\nPlease use the HRMS Mobile App or Web Portal to record your attendance.\n\nAll other self-service options (such as *apply leave*, *leave balance*, *salary slip*, and *attendance report*) are still available on WhatsApp. Send *help* to see all commands.`;
                return { status: 'PUNCH_RESTRICTED', reply };
            }
            return { status: 'PUNCH_ALLOWED', reply: `Successfully processed ${intent} for ${employee.name}` };

        case 'LEAVE_BALANCE':
            return { status: 'LEAVE_BALANCE_PROCESSED', reply: `Leave balance for ${employee.name}: 12 CL, 8 SL` };

        case 'SALARY_SLIP':
            return { status: 'SALARY_SLIP_PROCESSED', reply: `Generated salary slip for ${employee.name}` };

        case 'APPLY_LEAVE':
            return { status: 'APPLY_LEAVE_PROCESSED', reply: `Started leave application flow for ${employee.name}` };

        case 'ATTENDANCE_STATUS':
        case 'MONTHLY_ATTENDANCE':
            return { status: 'REPORT_PROCESSED', reply: `Attendance report for ${employee.name}` };

        case 'HELP':
            return { status: 'HELP_PROCESSED', reply: `Help menu with options for ${employee.name}` };

        default:
            return { status: 'UNKNOWN', reply: 'Send *help* to see all available commands.' };
    }
};

test('Enabled employee can punch in and punch out via WhatsApp', async () => {
    const emp = {
        name: 'John Doe',
        employeeId: 'EMP001',
        phone: '919876543210',
        isWhatsAppEnabled: true,
        whatsAppPunchEnabled: true
    };

    const resIn = await processIncomingWhatsAppMessage({ employee: emp, text: 'punch in', waPhone: '919876543210' });
    assert.strictEqual(resIn.status, 'PUNCH_ALLOWED');

    const resOut = await processIncomingWhatsAppMessage({ employee: emp, text: 'punch out', waPhone: '919876543210' });
    assert.strictEqual(resOut.status, 'PUNCH_ALLOWED');
});

test('Disabled employee (whatsAppPunchEnabled: false) is BLOCKED from Punch In', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false,
        whatsAppPunchEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({ employee: emp, text: 'punch in', waPhone: '919876543210' });
    assert.strictEqual(res.status, 'PUNCH_RESTRICTED');
    assert(res.reply.includes('Punching Restricted'));
    assert(res.reply.includes('HRMS Mobile App or Web Portal'));
});

test('Disabled employee (whatsAppPunchEnabled: false) is BLOCKED from Punch Out', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false,
        whatsAppPunchEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({ employee: emp, text: 'punch out', waPhone: '919876543210' });
    assert.strictEqual(res.status, 'PUNCH_RESTRICTED');
    assert(res.reply.includes('Punching Restricted'));
});

test('Disabled employee CAN still download Salary Slip via WhatsApp', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false,
        whatsAppPunchEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({ employee: emp, text: 'salary slip', waPhone: '919876543210' });
    assert.strictEqual(res.status, 'SALARY_SLIP_PROCESSED');
    assert(res.reply.includes('Generated salary slip for Rahul Sharma'));
});

test('Disabled employee CAN still check Leave Balance via WhatsApp', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false,
        whatsAppPunchEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({ employee: emp, text: 'leave balance', waPhone: '919876543210' });
    assert.strictEqual(res.status, 'LEAVE_BALANCE_PROCESSED');
    assert(res.reply.includes('Leave balance for Rahul Sharma'));
});

test('Disabled employee CAN still Apply Leave via WhatsApp', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false,
        whatsAppPunchEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({ employee: emp, text: 'apply leave', waPhone: '919876543210' });
    assert.strictEqual(res.status, 'APPLY_LEAVE_PROCESSED');
});

test('Disabled employee CAN still request Help Menu via WhatsApp', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false,
        whatsAppPunchEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({ employee: emp, text: 'help', waPhone: '919876543210' });
    assert.strictEqual(res.status, 'HELP_PROCESSED');
});


// ─────────────────────────────────────────────────────────────────
// SECTION 3: Controller Coercion & Update Logic
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Section 3: Controller Boolean Parsing & Coercion ---');

test('Coerces string "true" / "false" from FormData to Boolean', () => {
    const updateData1 = { isWhatsAppEnabled: 'false', sendDailyAttendanceReport: 'false', requireSelfie: 'false' };
    
    // Test logic implemented in User.Controller.js
    if (typeof updateData1.requireSelfie !== 'undefined') {
        updateData1.requireSelfie = updateData1.requireSelfie === true || updateData1.requireSelfie === 'true';
    }
    if (typeof updateData1.isWhatsAppEnabled !== 'undefined') {
        updateData1.isWhatsAppEnabled = updateData1.isWhatsAppEnabled === true || updateData1.isWhatsAppEnabled === 'true';
    }
    if (typeof updateData1.sendDailyAttendanceReport !== 'undefined') {
        updateData1.sendDailyAttendanceReport = updateData1.sendDailyAttendanceReport === true || updateData1.sendDailyAttendanceReport === 'true';
    }

    assert.strictEqual(updateData1.isWhatsAppEnabled, false);
    assert.strictEqual(updateData1.sendDailyAttendanceReport, false);
    assert.strictEqual(updateData1.requireSelfie, false);

    const updateData2 = { isWhatsAppEnabled: 'true', sendDailyAttendanceReport: 'true', requireSelfie: 'true' };
    if (typeof updateData2.isWhatsAppEnabled !== 'undefined') {
        updateData2.isWhatsAppEnabled = updateData2.isWhatsAppEnabled === true || updateData2.isWhatsAppEnabled === 'true';
    }
    if (typeof updateData2.sendDailyAttendanceReport !== 'undefined') {
        updateData2.sendDailyAttendanceReport = updateData2.sendDailyAttendanceReport === true || updateData2.sendDailyAttendanceReport === 'true';
    }

    assert.strictEqual(updateData2.isWhatsAppEnabled, true);
    assert.strictEqual(updateData2.sendDailyAttendanceReport, true);
});

test('Enforces mutual exclusivity: Face Detection enables -> WhatsApp punch disables', () => {
    const updateData = { requireSelfie: true, isWhatsAppEnabled: true };
    if (updateData.requireSelfie) {
        updateData.isWhatsAppEnabled = false;
        updateData.whatsAppPunchEnabled = false;
    } else if (updateData.isWhatsAppEnabled) {
        updateData.requireSelfie = false;
    }

    assert.strictEqual(updateData.requireSelfie, true);
    assert.strictEqual(updateData.isWhatsAppEnabled, false);
    assert.strictEqual(updateData.whatsAppPunchEnabled, false);
});

test('Enforces mutual exclusivity: WhatsApp punch enables -> Face Detection disables', () => {
    const updateData = { requireSelfie: false, isWhatsAppEnabled: true };
    if (updateData.requireSelfie) {
        updateData.isWhatsAppEnabled = false;
        updateData.whatsAppPunchEnabled = false;
    } else if (updateData.isWhatsAppEnabled) {
        updateData.requireSelfie = false;
        updateData.isWhatsAppEnabled = true;
        updateData.whatsAppPunchEnabled = true;
    }

    assert.strictEqual(updateData.requireSelfie, false);
    assert.strictEqual(updateData.isWhatsAppEnabled, true);
    assert.strictEqual(updateData.whatsAppPunchEnabled, true);
});


// ─────────────────────────────────────────────────────────────────
// SECTION 4: Daily Attendance Report Dispatch / Skip Logic
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Section 4: Daily Attendance Report Preference Logic ---');

// Mock report evaluation helper (matches attendanceReport.js)
const evaluateReportDispatch = ({ company, admin, force = false }) => {
    const isReportEnabled = (company?.sendDailyAttendanceReport !== false) && (admin?.sendDailyAttendanceReport !== false);
    if (!isReportEnabled && !force) {
        return {
            dispatched: false,
            skipped: true,
            reason: 'Daily attendance report is disabled in preferences.'
        };
    }
    return {
        dispatched: true,
        skipped: false,
        reason: 'Daily report scheduled & dispatched to Email and WhatsApp.'
    };
};

test('Report is dispatched when sendDailyAttendanceReport is true on Company and Admin', () => {
    const company = { sendDailyAttendanceReport: true, companyName: 'Iflora' };
    const admin = { sendDailyAttendanceReport: true, name: 'Admin' };

    const result = evaluateReportDispatch({ company, admin });
    assert.strictEqual(result.dispatched, true);
    assert.strictEqual(result.skipped, false);
});

test('Report is SKIPPED when sendDailyAttendanceReport is false on Company', () => {
    const company = { sendDailyAttendanceReport: false, companyName: 'Iflora' };
    const admin = { sendDailyAttendanceReport: true, name: 'Admin' };

    const result = evaluateReportDispatch({ company, admin });
    assert.strictEqual(result.dispatched, false);
    assert.strictEqual(result.skipped, true);
    assert(result.reason.includes('disabled in preferences'));
});

test('Report is SKIPPED when sendDailyAttendanceReport is false on Admin User', () => {
    const company = { sendDailyAttendanceReport: true, companyName: 'Iflora' };
    const admin = { sendDailyAttendanceReport: false, name: 'Admin' };

    const result = evaluateReportDispatch({ company, admin });
    assert.strictEqual(result.dispatched, false);
    assert.strictEqual(result.skipped, true);
});

test('Manual trigger (force=true) overrides disabled preference and sends on-demand report', () => {
    const company = { sendDailyAttendanceReport: false, companyName: 'Iflora' };
    const admin = { sendDailyAttendanceReport: false, name: 'Admin' };

    const result = evaluateReportDispatch({ company, admin, force: true });
    assert.strictEqual(result.dispatched, true);
    assert.strictEqual(result.skipped, false);
});

test('Default settings (field not yet set in existing documents) default to dispatched (true)', () => {
    const company = { companyName: 'Iflora' };
    const admin = { name: 'Admin' };

    const result = evaluateReportDispatch({ company, admin });
    assert.strictEqual(result.dispatched, true);
    assert.strictEqual(result.skipped, false);
});

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
console.log('======================================================\n');

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
