/**
 * tests/late_early_penalty.test.js
 *
 * Automated test suite for:
 * 1. Late arrival detection and relaxation window calculations
 * 2. Penalty slab calculation (Flat, Tiered, Percentage, Grace count)
 * 3. WhatsApp Late Punch-In reason collection flow & shortcut
 * 4. WhatsApp Early Departure detection, work report, & reason flow
 * 5. Automatic Half-Day triggering (Midpoint & threshold_time)
 */

import assert from 'assert';
import { parseTimeToMinutes } from '../controllers/Attendance.Controller.js';
import { calculatePenaltyAmount } from '../controllers/PenaltyRule.Controller.js';

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

console.log('\n=== Late Arrival & Early Departure Penalty Feature Tests ===\n');

// ─────────────────────────────────────────────────────────────────
// SUITE 1: Time Parsing Tests
// ─────────────────────────────────────────────────────────────────
console.log('Suite 1 — Time Parsing (parseTimeToMinutes):');

test('Parses 24-hour format "09:30" to 570 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('09:30'), 570);
});

test('Parses 12-hour AM format "9:30 AM" to 570 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('9:30 AM'), 570);
});

test('Parses 12-hour PM format "06:30 PM" to 1110 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('06:30 PM'), 1110);
});

test('Parses midnight "12:00 AM" to 0 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('12:00 AM'), 0);
});

test('Parses noon "12:00 PM" to 720 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('12:00 PM'), 720);
});

test('Returns null for invalid or empty time', () => {
    assert.strictEqual(parseTimeToMinutes(null), null);
    assert.strictEqual(parseTimeToMinutes(''), null);
    assert.strictEqual(parseTimeToMinutes('invalid'), null);
});

// ─────────────────────────────────────────────────────────────────
// SUITE 2: Late Arrival & Relaxation Window Logic
// ─────────────────────────────────────────────────────────────────
console.log('\nSuite 2 — Late Arrival & 5-Minute Relaxation:');

const isPunchLate = (punchTimeStr, shiftStartStr, relaxationMins) => {
    const punchMins = parseTimeToMinutes(punchTimeStr);
    const startMins = parseTimeToMinutes(shiftStartStr);
    const lateByMins = Math.max(0, punchMins - startMins);
    const isLate = lateByMins > relaxationMins;
    return { lateByMins, isLate };
};

test('On time at 09:30 with 09:30 shift: 0 mins late, NOT late', () => {
    const res = isPunchLate('09:30', '09:30', 5);
    assert.strictEqual(res.lateByMins, 0);
    assert.strictEqual(res.isLate, false);
});

test('Within relaxation at 09:34 (4 mins late): NOT penalized', () => {
    const res = isPunchLate('09:34', '09:30', 5);
    assert.strictEqual(res.lateByMins, 4);
    assert.strictEqual(res.isLate, false);
});

test('At relaxation boundary 09:35 (5 mins late): NOT penalized (5 <= 5)', () => {
    const res = isPunchLate('09:35', '09:30', 5);
    assert.strictEqual(res.lateByMins, 5);
    assert.strictEqual(res.isLate, false);
});

test('Past relaxation boundary at 09:36 (6 mins late): IS late (6 > 5)', () => {
    const res = isPunchLate('09:36', '09:30', 5);
    assert.strictEqual(res.lateByMins, 6);
    assert.strictEqual(res.isLate, true);
});

test('15 minutes late at 09:45: IS late (15 > 5)', () => {
    const res = isPunchLate('09:45', '09:30', 5);
    assert.strictEqual(res.lateByMins, 15);
    assert.strictEqual(res.isLate, true);
});

// ─────────────────────────────────────────────────────────────────
// SUITE 3: Penalty Calculation using calculatePenaltyAmount
// ─────────────────────────────────────────────────────────────────
console.log('\nSuite 3 — Penalty Rule Slab Calculation:');

const mockRuleSingleSlab = {
    slabs: [
        {
            penaltyType: 'Late In Minutes',
            minTime: 5,
            maxTime: null,
            type: 'Flat',
            value: 150,
            grace_count: 0
        }
    ]
};

const mockRuleTiered = {
    slabs: [
        {
            penaltyType: 'Late In Minutes',
            minTime: 5,
            maxTime: 45,
            type: 'Flat',
            value: 150,
            grace_count: 0
        },
        {
            penaltyType: 'Late In Minutes',
            minTime: 46,
            maxTime: 90,
            type: 'Flat',
            value: 250,
            grace_count: 0
        },
        {
            penaltyType: 'Early Out Minutes',
            minTime: 15,
            maxTime: 60,
            type: 'Flat',
            value: 100,
            grace_count: 0
        }
    ]
};

await asyncTest('Matches Flat ₹150 penalty for 6 mins late arrival', async () => {
    const amount = await calculatePenaltyAmount('dummy_shift', 6, null, mockRuleSingleSlab, 0, 'Late In Minutes');
    assert.strictEqual(amount, 150);
});

await asyncTest('Returns 0 penalty for 4 mins late (below slab minTime 5)', async () => {
    const amount = await calculatePenaltyAmount('dummy_shift', 4, null, mockRuleSingleSlab, 0, 'Late In Minutes');
    assert.strictEqual(amount, 0);
});

await asyncTest('Tiered slab matches tier 1 (₹150) for 30 mins late', async () => {
    const amount = await calculatePenaltyAmount('dummy_shift', 30, null, mockRuleTiered, 0, 'Late In Minutes');
    assert.strictEqual(amount, 150);
});

await asyncTest('Tiered slab matches tier 2 (₹250) for 60 mins late', async () => {
    const amount = await calculatePenaltyAmount('dummy_shift', 60, null, mockRuleTiered, 0, 'Late In Minutes');
    assert.strictEqual(amount, 250);
});

await asyncTest('Calculates Early Out penalty (₹100) for 30 mins early departure', async () => {
    const amount = await calculatePenaltyAmount('dummy_shift', 30, null, mockRuleTiered, 0, 'Early Out Minutes');
    assert.strictEqual(amount, 100);
});

await asyncTest('Grace occurrence check: returns 0 if late count < grace_count', async () => {
    const ruleWithGrace = {
        slabs: [{
            penaltyType: 'Late In Minutes',
            minTime: 5,
            maxTime: null,
            type: 'Flat',
            value: 200,
            grace_count: 2
        }]
    };
    // Employee has 1 late entry so far this month, which is < grace_count of 2
    const amount = await calculatePenaltyAmount('dummy_shift', 10, 'emp123', ruleWithGrace, 1, 'Late In Minutes');
    assert.strictEqual(amount, 0);
});

// ─────────────────────────────────────────────────────────────────
// SUITE 4: WhatsApp Message & Intent Extraction Logic
// ─────────────────────────────────────────────────────────────────
console.log('\nSuite 4 — WhatsApp Message & Intent Extraction:');

const extractDirectReason = (text, prefix) => {
    const regex = new RegExp(`^(${prefix})[:\\s-]*`, 'i');
    return text.replace(regex, '').trim();
};

test('Direct reason extracted from "punch in: flat tyre"', () => {
    const reason = extractDirectReason('punch in: flat tyre', 'punch\\s*in|checkin|in');
    assert.strictEqual(reason, 'flat tyre');
});

test('Direct reason extracted from "in - heavy rain"', () => {
    const reason = extractDirectReason('in - heavy rain', 'punch\\s*in|checkin|in');
    assert.strictEqual(reason, 'heavy rain');
});

test('Direct reason extracted from "punch in: stuck in traffic jam"', () => {
    const reason = extractDirectReason('punch in: stuck in traffic jam', 'punch\\s*in|checkin|in');
    assert.strictEqual(reason, 'stuck in traffic jam');
});

test('Plain "punch in" produces empty string (triggers bot reason prompt)', () => {
    const reason = extractDirectReason('punch in', 'punch\\s*in|checkin|in');
    assert.strictEqual(reason, '');
});

test('Direct work report extracted from "punch out: fixed 3 bugs in auth module"', () => {
    const report = extractDirectReason('punch out: fixed 3 bugs in auth module', 'punch\\s*out|checkout|out');
    assert.strictEqual(report, 'fixed 3 bugs in auth module');
});

// ─────────────────────────────────────────────────────────────────
// SUITE 5: Early Departure Calculation
// ─────────────────────────────────────────────────────────────────
console.log('\nSuite 5 — Early Departure Detection:');

const isPunchEarly = (punchOutStr, shiftEndStr, maxEarlyMins) => {
    const punchMins = parseTimeToMinutes(punchOutStr);
    const endMins = parseTimeToMinutes(shiftEndStr);
    const earlyByMins = Math.max(0, endMins - punchMins);
    const isEarly = earlyByMins > maxEarlyMins;
    return { earlyByMins, isEarly };
};

test('Punching out at 18:30 for 18:30 shift: 0 mins early, NOT early', () => {
    const res = isPunchEarly('18:30', '18:30', 0);
    assert.strictEqual(res.earlyByMins, 0);
    assert.strictEqual(res.isEarly, false);
});

test('Punching out at 19:00 for 18:30 shift: 0 mins early (overtime), NOT early', () => {
    const res = isPunchEarly('19:00', '18:30', 0);
    assert.strictEqual(res.earlyByMins, 0);
    assert.strictEqual(res.isEarly, false);
});

test('Punching out at 17:45 for 18:30 shift: 45 mins early, IS early', () => {
    const res = isPunchEarly('17:45', '18:30', 0);
    assert.strictEqual(res.earlyByMins, 45);
    assert.strictEqual(res.isEarly, true);
});

test('Punching out at 18:25 for 18:30 shift with 10 mins early grace: NOT early (5 <= 10)', () => {
    const res = isPunchEarly('18:25', '18:30', 10);
    assert.strictEqual(res.earlyByMins, 5);
    assert.strictEqual(res.isEarly, false);
});

// ─────────────────────────────────────────────────────────────────
// SUITE 6: Midpoint Half-Day Calculation
// ─────────────────────────────────────────────────────────────────
console.log('\nSuite 6 — Automatic Half-Day Midpoint Logic:');

const isPastMidpoint = (nowStr, shiftStartStr, shiftEndStr) => {
    const nowMins = parseTimeToMinutes(nowStr);
    const startMins = parseTimeToMinutes(shiftStartStr);
    const endMins = parseTimeToMinutes(shiftEndStr);
    const duration = endMins > startMins ? endMins - startMins : (endMins + 1440 - startMins);
    const midpointMins = (startMins + (duration / 2)) % 1440;
    return nowMins > midpointMins;
};

test('Shift 09:30 to 18:30 has midpoint at 14:00 (2:00 PM)', () => {
    const start = parseTimeToMinutes('09:30');
    const end = parseTimeToMinutes('18:30');
    const midpoint = (start + (end - start) / 2);
    assert.strictEqual(midpoint, 840); // 14:00
});

test('Punch in at 13:00 (1:00 PM) is BEFORE midpoint -> Present', () => {
    assert.strictEqual(isPastMidpoint('13:00', '09:30', '18:30'), false);
});

test('Punch in at 14:30 (2:30 PM) is PAST midpoint -> Half Day', () => {
    assert.strictEqual(isPastMidpoint('14:30', '09:30', '18:30'), true);
});

console.log(`\n=== Late & Early Penalty Tests Complete: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
    process.exit(1);
}
