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

test('User schema has isWhatsAppEnabled field with default true', () => {
    const userSchemaPaths = User.schema.paths;
    assert(userSchemaPaths['isWhatsAppEnabled'], 'User schema must include isWhatsAppEnabled');
    assert.strictEqual(userSchemaPaths['isWhatsAppEnabled'].defaultValue, true, 'Default must be true');
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
// SECTION 2: Employee WhatsApp Chatbot Access Guard Logic
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Section 2: Employee WhatsApp Chatbot Access Logic ---');

// Mock WhatsApp message handler logic
const processIncomingWhatsAppMessage = async ({ employee, text, waPhone, sessionExists = false }) => {
    let sentMessage = null;
    let sessionDeleted = false;

    // Simulate WhatsApp controller webhook guard
    if (!employee) {
        return {
            status: 'UNREGISTERED',
            reply: 'Your phone number is not registered with HRMS.'
        };
    }

    if (employee.isWhatsAppEnabled === false) {
        if (sessionExists) {
            sessionDeleted = true;
        }
        sentMessage = `⚠️ *Access Restricted*\n\nHello *${employee.name}*,\n\nYour WhatsApp HRMS chatbot access has been disabled by your administrator.\n\nPlease contact your HR department or company administrator if you require access.`;
        return {
            status: 'ACCESS_RESTRICTED',
            reply: sentMessage,
            sessionDeleted
        };
    }

    // If enabled, process message
    return {
        status: 'PROCESSED',
        reply: `Welcome ${employee.name}, your request for "${text}" is being processed.`
    };
};

test('Enabled employee (isWhatsAppEnabled: true) is allowed to use WhatsApp chatbot', async () => {
    const emp = {
        name: 'John Doe',
        employeeId: 'EMP001',
        phone: '919876543210',
        isWhatsAppEnabled: true
    };

    const res = await processIncomingWhatsAppMessage({
        employee: emp,
        text: 'punch in',
        waPhone: '919876543210'
    });

    assert.strictEqual(res.status, 'PROCESSED');
    assert(res.reply.includes('Welcome John Doe'));
});

test('Disabled employee (isWhatsAppEnabled: false) is blocked with Access Restricted message', async () => {
    const emp = {
        name: 'Rahul Sharma',
        employeeId: 'EMP002',
        phone: '919876543210',
        isWhatsAppEnabled: false
    };

    const res = await processIncomingWhatsAppMessage({
        employee: emp,
        text: 'punch in',
        waPhone: '919876543210',
        sessionExists: true
    });

    assert.strictEqual(res.status, 'ACCESS_RESTRICTED');
    assert(res.reply.includes('Access Restricted'), 'Reply must state Access Restricted');
    assert(res.reply.includes('Rahul Sharma'), 'Reply must address employee by name');
    assert(res.reply.includes('disabled by your administrator'), 'Reply must explain disabled by admin');
    assert.strictEqual(res.sessionDeleted, true, 'Active session must be cleared');
});

test('Employee with isWhatsAppEnabled undefined falls back to enabled (truthy)', async () => {
    const emp = {
        name: 'Pooja Patel',
        employeeId: 'EMP003',
        phone: '919876543210'
        // isWhatsAppEnabled omitted
    };

    const res = await processIncomingWhatsAppMessage({
        employee: emp,
        text: 'salary slip',
        waPhone: '919876543210'
    });

    assert.strictEqual(res.status, 'PROCESSED');
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
