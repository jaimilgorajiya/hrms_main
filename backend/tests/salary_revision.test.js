/**
 * tests/salary_revision.test.js
 *
 * Comprehensive unit/integration test suite for the Salary Increment / Decrement module.
 *
 * Tests cover:
 *  1. Schema & model validation (SalaryRevision)
 *  2. Business logic: salary computation helpers
 *  3. Controller-level: createSalaryRevision logic simulation
 *  4. Controller-level: revert logic
 *  5. Edge cases: zero salary, negative results, missing CTC, boundary values
 *  6. Delta calculations: percentage and fixed modes
 *  7. Component scaling (earnings distribution)
 *
 * Run: node backend/tests/salary_revision.test.js
 */

import assert from 'assert';
import SalaryRevision from '../models/SalaryRevision.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

const test = (name, fn) => {
    try {
        fn();
        console.log(`  ✅  ${name}`);
        passed++;
        results.push({ name, status: 'PASS' });
    } catch (err) {
        console.error(`  ❌  ${name}`);
        console.error(`       → ${err.message}`);
        failed++;
        results.push({ name, status: 'FAIL', error: err.message });
    }
};

const asyncTest = async (name, fn) => {
    try {
        await fn();
        console.log(`  ✅  ${name}`);
        passed++;
        results.push({ name, status: 'PASS' });
    } catch (err) {
        console.error(`  ❌  ${name}`);
        console.error(`       → ${err.message}`);
        failed++;
        results.push({ name, status: 'FAIL', error: err.message });
    }
};

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   🧪 SALARY REVISION MODULE — TEST SUITE                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ─── SECTION 1: Schema Validation ────────────────────────────────────────────
console.log('── Section 1: Schema & Model Definitions ──────────────────────\n');

test('SalaryRevision model is defined and has correct name', () => {
    assert.ok(SalaryRevision, 'SalaryRevision model must be defined');
    assert.strictEqual(SalaryRevision.modelName, 'SalaryRevision', 'Model name must be SalaryRevision');
});

test('SalaryRevision schema has required fields: adminId, employeeId, revisionType', () => {
    const paths = SalaryRevision.schema.paths;
    assert.ok(paths['adminId'], 'Schema must have adminId');
    assert.ok(paths['employeeId'], 'Schema must have employeeId');
    assert.ok(paths['revisionType'], 'Schema must have revisionType');
});

test('SalaryRevision revisionType enum is [Increment, Decrement]', () => {
    const enumVals = SalaryRevision.schema.paths['revisionType'].enumValues;
    assert.deepStrictEqual(enumVals, ['Increment', 'Decrement']);
});

test('SalaryRevision adjustmentMode enum is [percentage, fixed]', () => {
    const enumVals = SalaryRevision.schema.paths['adjustmentMode'].enumValues;
    assert.deepStrictEqual(enumVals, ['percentage', 'fixed']);
});

test('SalaryRevision status default is Applied', () => {
    const statusDefault = SalaryRevision.schema.paths['status'].defaultValue;
    assert.strictEqual(statusDefault, 'Applied');
});

test('SalaryRevision status enum is [Applied, Pending, Reverted]', () => {
    const enumVals = SalaryRevision.schema.paths['status'].enumValues;
    assert.deepStrictEqual(enumVals, ['Applied', 'Pending', 'Reverted']);
});

test('SalaryRevision schema has all salary snapshot fields', () => {
    const paths = SalaryRevision.schema.paths;
    const required = [
        'previousAnnualCTC', 'previousMonthlyGross', 'previousNetSalary',
        'newAnnualCTC', 'newMonthlyGross', 'newNetSalary',
        'deltaAmount', 'deltaPercentage', 'effectiveDate', 'adjustmentValue'
    ];
    required.forEach(field => {
        assert.ok(paths[field], `Schema must have field: ${field}`);
    });
});

test('EmployeeCTC model has history array with required fields', () => {
    const paths = EmployeeCTC.schema.paths;
    assert.ok(paths['history'], 'EmployeeCTC must have a history field');
    assert.ok(paths['incrementPercentage'], 'EmployeeCTC must have incrementPercentage');
    assert.ok(paths['effectiveDate'], 'EmployeeCTC must have effectiveDate');
});

test('EmployeeCTC status enum includes Active, Inactive, Revised', () => {
    const enumVals = EmployeeCTC.schema.paths['status'].enumValues;
    assert.ok(enumVals.includes('Active'), 'Must include Active');
    assert.ok(enumVals.includes('Inactive'), 'Must include Inactive');
    assert.ok(enumVals.includes('Revised'), 'Must include Revised');
});

// ─── SECTION 2: Salary Computation Logic ─────────────────────────────────────
console.log('\n── Section 2: Salary Computation — Percentage Mode ────────────\n');

/**
 * Replicates the core computation from the controller for unit testing
 */
const computeSalaryRevision = (prevAnnual, prevMonthly, prevNet, adjustmentMode, adjustmentValue) => {
    const adjVal = parseFloat(adjustmentValue);
    let newAnnual, newMonthly, newNet, factor, fixedDelta;

    if (adjustmentMode === 'percentage') {
        factor = 1 + (adjVal / 100);
        newAnnual = Math.round(prevAnnual * factor);
        newMonthly = Math.round(prevMonthly * factor);
        newNet = Math.round(prevNet * factor);
    } else {
        newAnnual = Math.round(prevAnnual + adjVal);
        newMonthly = Math.round(prevMonthly + (adjVal / 12));
        newNet = Math.round(prevNet + (adjVal / 12));
        fixedDelta = adjVal / 12;
    }

    const deltaAmount = newAnnual - prevAnnual;
    const deltaPercentage = prevAnnual > 0
        ? parseFloat(((deltaAmount / prevAnnual) * 100).toFixed(2))
        : 0;

    const revisionType = adjVal >= 0 ? 'Increment' : 'Decrement';

    return { newAnnual, newMonthly, newNet, deltaAmount, deltaPercentage, revisionType, factor, fixedDelta };
};

test('10% increment on 600000 annual CTC = 660000', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'percentage', 10);
    assert.strictEqual(res.newAnnual, 660000);
    assert.strictEqual(res.revisionType, 'Increment');
    assert.strictEqual(res.deltaAmount, 60000);
    assert.strictEqual(res.deltaPercentage, 10);
});

test('20% increment on 1200000 annual CTC = 1440000', () => {
    const res = computeSalaryRevision(1200000, 100000, 90000, 'percentage', 20);
    assert.strictEqual(res.newAnnual, 1440000);
    assert.strictEqual(res.deltaAmount, 240000);
    assert.strictEqual(res.deltaPercentage, 20);
});

test('5% increment: monthly gross scales proportionally', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'percentage', 5);
    assert.strictEqual(res.newMonthly, 52500);
    assert.strictEqual(res.newAnnual, 630000);
});

test('15% increment: delta percentage is 15', () => {
    const res = computeSalaryRevision(800000, 66667, 60000, 'percentage', 15);
    assert.strictEqual(res.deltaPercentage, 15);
    assert.strictEqual(res.revisionType, 'Increment');
});

test('0% adjustment: no change (adjVal 0 is rejected by validation — but math should return same)', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'percentage', 0);
    assert.strictEqual(res.newAnnual, 600000);
    assert.strictEqual(res.deltaAmount, 0);
    assert.strictEqual(res.deltaPercentage, 0);
});

console.log('\n── Section 3: Salary Computation — Decrement (Negative Values) ─\n');

test('-10% decrement on 600000 CTC = 540000', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'percentage', -10);
    assert.strictEqual(res.newAnnual, 540000);
    assert.strictEqual(res.revisionType, 'Decrement');
    assert.strictEqual(res.deltaAmount, -60000);
    assert.strictEqual(res.deltaPercentage, -10);
});

test('-5% decrement: monthly gross reduces correctly', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'percentage', -5);
    assert.strictEqual(res.newMonthly, 47500);
    assert.strictEqual(res.newAnnual, 570000);
});

test('-50% decrement on 400000 CTC = 200000', () => {
    const res = computeSalaryRevision(400000, 33333, 30000, 'percentage', -50);
    assert.strictEqual(res.newAnnual, 200000);
    assert.strictEqual(res.revisionType, 'Decrement');
    assert.ok(res.deltaAmount < 0);
});

test('Large decrement: -100% results in 0 (boundary case)', () => {
    const res = computeSalaryRevision(500000, 41667, 37500, 'percentage', -100);
    assert.strictEqual(res.newAnnual, 0);
    assert.strictEqual(res.deltaAmount, -500000);
});

console.log('\n── Section 4: Salary Computation — Fixed Amount Mode ───────────\n');

test('Fixed +60000 annual increment on 600000 = 660000', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'fixed', 60000);
    assert.strictEqual(res.newAnnual, 660000);
    assert.strictEqual(res.revisionType, 'Increment');
    assert.strictEqual(res.deltaAmount, 60000);
});

test('Fixed +60000: monthly increases by 5000 (60000/12)', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'fixed', 60000);
    assert.strictEqual(res.newMonthly, 55000); // 50000 + 5000
});

test('Fixed -24000 annual decrement on 600000 = 576000', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'fixed', -24000);
    assert.strictEqual(res.newAnnual, 576000);
    assert.strictEqual(res.revisionType, 'Decrement');
    assert.strictEqual(res.deltaAmount, -24000);
});

test('Fixed +120000 annual increment: delta percentage ≈ 20%', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'fixed', 120000);
    assert.strictEqual(res.newAnnual, 720000);
    assert.strictEqual(res.deltaPercentage, 20);
});

test('Fixed mode with non-divisible value: monthly is Math.rounded', () => {
    const res = computeSalaryRevision(600000, 50000, 45000, 'fixed', 10001);
    // 10001/12 = 833.4166... → Math.round = 833
    // so newMonthly = 50000 + 833 = 50833
    assert.strictEqual(res.newMonthly, 50833);
});

console.log('\n── Section 5: Component Scaling Logic ──────────────────────────\n');

/**
 * Replicates scaleComponents from the controller
 */
const scaleComponents = (components, factor, fixedDelta, mode, totalBase) => {
    return components.map(comp => {
        let newAmount;
        if (mode === 'percentage') {
            newAmount = Math.round(comp.amount * factor);
        } else {
            const weight = totalBase > 0 ? comp.amount / totalBase : 0;
            newAmount = Math.round(comp.amount + fixedDelta * weight);
        }
        return { ...comp, amount: Math.max(0, newAmount) };
    });
};

const mockEarnings = [
    { componentName: 'Basic', amount: 25000 },
    { componentName: 'HRA', amount: 10000 },
    { componentName: 'Special Allowance', amount: 15000 }
];

test('10% increment: Basic 25000 → 27500', () => {
    const factor = 1.10;
    const scaled = scaleComponents(mockEarnings, factor, 0, 'percentage', 50000);
    const basic = scaled.find(e => e.componentName === 'Basic');
    assert.strictEqual(basic.amount, 27500);
});

test('10% increment: all components scale by 10%', () => {
    const factor = 1.10;
    const scaled = scaleComponents(mockEarnings, factor, 0, 'percentage', 50000);
    assert.strictEqual(scaled[0].amount, 27500); // Basic
    assert.strictEqual(scaled[1].amount, 11000); // HRA
    assert.strictEqual(scaled[2].amount, 16500); // Special
});

test('Fixed mode: distribute +5000/month across components by weight', () => {
    // total = 50000, fixedDelta = 5000
    // Basic: 25000/50000 = 50% → +2500 → 27500
    // HRA: 10000/50000 = 20% → +1000 → 11000
    // Special: 15000/50000 = 30% → +1500 → 16500
    const scaled = scaleComponents(mockEarnings, 1, 5000, 'fixed', 50000);
    assert.strictEqual(scaled[0].amount, 27500);
    assert.strictEqual(scaled[1].amount, 11000);
    assert.strictEqual(scaled[2].amount, 16500);
});

test('Decrement does not make any component amount negative (clamped to 0)', () => {
    const tiny = [{ componentName: 'Bonus', amount: 100 }];
    const scaled = scaleComponents(tiny, 0.01, 0, 'percentage', 100); // 1% of 100 = 1
    assert.ok(scaled[0].amount >= 0, 'Component amount must be >= 0');
});

test('-90% decrement: component amounts are clamped to >= 0', () => {
    const factor = 0.10; // -90%
    const scaled = scaleComponents(mockEarnings, factor, 0, 'percentage', 50000);
    scaled.forEach(c => assert.ok(c.amount >= 0, `${c.componentName} must be >= 0`));
});

console.log('\n── Section 6: Delta Calculation Accuracy ───────────────────────\n');

test('Delta percentage is calculated correctly for 10% increment', () => {
    const { deltaPercentage } = computeSalaryRevision(600000, 50000, 45000, 'percentage', 10);
    assert.strictEqual(deltaPercentage, 10.00);
});

test('Delta percentage rounds to 2 decimal places (floating point safety)', () => {
    const { deltaPercentage } = computeSalaryRevision(300000, 25000, 22000, 'fixed', 10000);
    // (10000/300000)*100 = 3.3333... → 3.33
    assert.strictEqual(deltaPercentage, 3.33);
});

test('Delta amount is always newAnnual - prevAnnual', () => {
    const prev = 750000;
    const adj = 75000;
    const { newAnnual, deltaAmount } = computeSalaryRevision(prev, 62500, 56250, 'fixed', adj);
    assert.strictEqual(deltaAmount, newAnnual - prev);
});

test('Delta percentage is 0 when previous salary is 0 (no division by zero)', () => {
    const { deltaPercentage } = computeSalaryRevision(0, 0, 0, 'percentage', 10);
    assert.strictEqual(deltaPercentage, 0);
});

console.log('\n── Section 7: Validation Rules ─────────────────────────────────\n');

const validateRevisionInput = ({ employeeId, adjustmentMode, adjustmentValue, effectiveDate }) => {
    const errors = [];
    if (!employeeId) errors.push('employeeId is required');
    if (!['percentage', 'fixed'].includes(adjustmentMode)) errors.push('adjustmentMode must be percentage or fixed');
    if (adjustmentValue === undefined || adjustmentValue === null || adjustmentValue === '') errors.push('adjustmentValue is required');
    const val = parseFloat(adjustmentValue);
    if (!isNaN(val) && val === 0) errors.push('adjustmentValue must be non-zero');
    if (!effectiveDate) errors.push('effectiveDate is required');
    return errors;
};

test('Valid input passes all validation checks', () => {
    const errors = validateRevisionInput({
        employeeId: '507f1f77bcf86cd799439011',
        adjustmentMode: 'percentage',
        adjustmentValue: 10,
        effectiveDate: '2024-04-01'
    });
    assert.strictEqual(errors.length, 0);
});

test('Missing employeeId triggers validation error', () => {
    const errors = validateRevisionInput({
        employeeId: '',
        adjustmentMode: 'percentage',
        adjustmentValue: 10,
        effectiveDate: '2024-04-01'
    });
    assert.ok(errors.includes('employeeId is required'));
});

test('Invalid adjustmentMode triggers validation error', () => {
    const errors = validateRevisionInput({
        employeeId: '507f1f77bcf86cd799439011',
        adjustmentMode: 'unknown',
        adjustmentValue: 10,
        effectiveDate: '2024-04-01'
    });
    assert.ok(errors.some(e => e.includes('adjustmentMode')));
});

test('Zero adjustmentValue triggers validation error', () => {
    const errors = validateRevisionInput({
        employeeId: '507f1f77bcf86cd799439011',
        adjustmentMode: 'percentage',
        adjustmentValue: 0,
        effectiveDate: '2024-04-01'
    });
    assert.ok(errors.some(e => e.includes('non-zero')));
});

test('Missing effectiveDate triggers validation error', () => {
    const errors = validateRevisionInput({
        employeeId: '507f1f77bcf86cd799439011',
        adjustmentMode: 'fixed',
        adjustmentValue: 60000,
        effectiveDate: ''
    });
    assert.ok(errors.includes('effectiveDate is required'));
});

test('Negative percentage is valid (decrement use case)', () => {
    const errors = validateRevisionInput({
        employeeId: '507f1f77bcf86cd799439011',
        adjustmentMode: 'percentage',
        adjustmentValue: -10,
        effectiveDate: '2024-04-01'
    });
    assert.strictEqual(errors.length, 0, 'Negative value must be valid (decrement)');
});

console.log('\n── Section 8: Revision Type Detection ──────────────────────────\n');

test('Positive percentage → Increment type', () => {
    const { revisionType } = computeSalaryRevision(600000, 50000, 45000, 'percentage', 10);
    assert.strictEqual(revisionType, 'Increment');
});

test('Negative percentage → Decrement type', () => {
    const { revisionType } = computeSalaryRevision(600000, 50000, 45000, 'percentage', -5);
    assert.strictEqual(revisionType, 'Decrement');
});

test('Positive fixed amount → Increment type', () => {
    const { revisionType } = computeSalaryRevision(600000, 50000, 45000, 'fixed', 50000);
    assert.strictEqual(revisionType, 'Increment');
});

test('Negative fixed amount → Decrement type', () => {
    const { revisionType } = computeSalaryRevision(600000, 50000, 45000, 'fixed', -30000);
    assert.strictEqual(revisionType, 'Decrement');
});

console.log('\n── Section 9: Revert Logic ─────────────────────────────────────\n');

const simulateRevert = (revision) => {
    if (revision.status === 'Reverted') {
        throw new Error('This revision has already been reverted.');
    }
    return {
        annualCTC: revision.previousAnnualCTC,
        monthlyGross: revision.previousMonthlyGross,
        netSalary: revision.previousNetSalary,
        status: 'Active'
    };
};

test('Revert restores previousAnnualCTC correctly', () => {
    const rev = { status: 'Applied', previousAnnualCTC: 600000, previousMonthlyGross: 50000, previousNetSalary: 45000 };
    const restored = simulateRevert(rev);
    assert.strictEqual(restored.annualCTC, 600000);
});

test('Revert restores previousMonthlyGross correctly', () => {
    const rev = { status: 'Applied', previousAnnualCTC: 600000, previousMonthlyGross: 50000, previousNetSalary: 45000 };
    const restored = simulateRevert(rev);
    assert.strictEqual(restored.monthlyGross, 50000);
});

test('Revert on already-reverted revision throws error', () => {
    const rev = { status: 'Reverted', previousAnnualCTC: 600000, previousMonthlyGross: 50000, previousNetSalary: 45000 };
    assert.throws(() => simulateRevert(rev), /already been reverted/);
});

test('Revert sets CTC status back to Active', () => {
    const rev = { status: 'Applied', previousAnnualCTC: 600000, previousMonthlyGross: 50000, previousNetSalary: 45000 };
    const restored = simulateRevert(rev);
    assert.strictEqual(restored.status, 'Active');
});

console.log('\n── Section 10: Edge Cases ───────────────────────────────────────\n');

test('Very large salary: 10% increment on 50000000 annual CTC', () => {
    const { newAnnual, deltaAmount } = computeSalaryRevision(50000000, 4166667, 3750000, 'percentage', 10);
    assert.strictEqual(newAnnual, 55000000);
    assert.strictEqual(deltaAmount, 5000000);
});

test('Small salary: 10% increment on 120000 annual CTC = 132000', () => {
    const { newAnnual } = computeSalaryRevision(120000, 10000, 9000, 'percentage', 10);
    assert.strictEqual(newAnnual, 132000);
});

test('100% increment (doubling) on 600000 = 1200000', () => {
    const { newAnnual } = computeSalaryRevision(600000, 50000, 45000, 'percentage', 100);
    assert.strictEqual(newAnnual, 1200000);
});

test('Exact 1 rupee fixed increment: delta is 1', () => {
    const { deltaAmount } = computeSalaryRevision(600000, 50000, 45000, 'fixed', 1);
    assert.strictEqual(deltaAmount, 1);
});

test('Multiple sequential increments compound correctly', () => {
    // First: 600000 + 10% = 660000
    // Second: 660000 + 10% = 726000
    const first = computeSalaryRevision(600000, 50000, 45000, 'percentage', 10);
    const second = computeSalaryRevision(first.newAnnual, first.newMonthly, first.newNet, 'percentage', 10);
    assert.strictEqual(second.newAnnual, 726000);
});

test('Increment then equivalent decrement returns near-original salary', () => {
    const inc = computeSalaryRevision(600000, 50000, 45000, 'percentage', 10);
    // To get back: need to apply -9.09% (1/1.1 - 1 ≈ -9.09%)
    const dec = computeSalaryRevision(inc.newAnnual, inc.newMonthly, inc.newNet, 'percentage', -9.09);
    // Should be very close to 600000 (rounding may differ by a few rupees)
    assert.ok(Math.abs(dec.newAnnual - 600000) < 100, `Expected ~600000, got ${dec.newAnnual}`);
});


// ─── SECTION 11: Backdated Effective Date & Arrears Computation ─────────────
console.log('\n── Section 11: Backdated Effective Date & Arrears Logic ────────\n');

const simulateBackdatedArrears = (prevNet, newNet, effectiveDateStr, nowDate) => {
    const effDate = new Date(effectiveDateStr);
    const currentMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const effMonthStart = new Date(effDate.getFullYear(), effDate.getMonth(), 1);
    const isBackdated = effMonthStart < currentMonthStart;
    if (!isBackdated) return { isBackdated: false, arrearsMonths: [], arrearsAmount: 0, arrearsStatus: 'None' };
    const monthlyDelta = Math.round(newNet - prevNet);
    const arrearsMonths = [];
    let cursor = new Date(effMonthStart);
    while (cursor < currentMonthStart) {
        const m = cursor.getMonth() + 1;
        const y = cursor.getFullYear();
        arrearsMonths.push({ month: m, year: y, monthStr: `${y}-${String(m).padStart(2, '0')}`, monthlyDelta });
        cursor.setMonth(cursor.getMonth() + 1);
    }
    const arrearsAmount = Math.round(monthlyDelta * arrearsMonths.length);
    return { isBackdated, arrearsMonths, arrearsAmount, arrearsStatus: arrearsAmount !== 0 ? 'Pending' : 'None' };
};

const NOW = new Date(2025, 9, 5); // October 5 2025

test('Effective date in current month (Oct 2025) is NOT backdated', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2025-10-01', NOW);
    assert.strictEqual(r.isBackdated, false);
    assert.strictEqual(r.arrearsAmount, 0);
});
test('Effective date in future (Nov 2025) is NOT backdated', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 50000, '2025-11-01', NOW).isBackdated, false);
});
test('Sep 2025 effective, now Oct 2025 → isBackdated = true', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 50000, '2025-09-01', NOW).isBackdated, true);
});
test('Sep 2025 effective → 1 arrears month: 2025-09', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2025-09-01', NOW);
    assert.strictEqual(r.arrearsMonths.length, 1);
    assert.strictEqual(r.arrearsMonths[0].monthStr, '2025-09');
});
test('Aug 2025 effective → 2 arrears months [2025-08, 2025-09]', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2025-08-01', NOW);
    assert.strictEqual(r.arrearsMonths.length, 2);
    assert.deepStrictEqual(r.arrearsMonths.map(m => m.monthStr), ['2025-08', '2025-09']);
});
test('Apr 2025 effective → 6 arrears months (Apr–Sep)', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2025-04-01', NOW);
    assert.strictEqual(r.arrearsMonths.length, 6);
    assert.strictEqual(r.arrearsMonths[0].monthStr, '2025-04');
    assert.strictEqual(r.arrearsMonths[5].monthStr, '2025-09');
});
test('Dec 2024 effective → 10 months (Dec 2024 – Sep 2025)', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2024-12-01', NOW);
    assert.strictEqual(r.arrearsMonths.length, 10);
    assert.strictEqual(r.arrearsMonths[0].monthStr, '2024-12');
    assert.strictEqual(r.arrearsMonths[9].monthStr, '2025-09');
});
test('Monthly delta = newNet - prevNet (5000 for 45000->50000)', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2025-08-01', NOW);
    assert.strictEqual(r.arrearsMonths[0].monthlyDelta, 5000);
});
test('2 months x 5000 = 10000 total arrears', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 50000, '2025-08-01', NOW).arrearsAmount, 10000);
});
test('6 months x 5000 = 30000 total arrears', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 50000, '2025-04-01', NOW).arrearsAmount, 30000);
});
test('Decrement: -5000/month x 2 = -10000 arrears', () => {
    const r = simulateBackdatedArrears(50000, 45000, '2025-08-01', NOW);
    assert.strictEqual(r.arrearsAmount, -10000);
});
test('arrearsStatus is Pending when amount != 0', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 50000, '2025-08-01', NOW).arrearsStatus, 'Pending');
});
test('arrearsStatus is None when delta = 0', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 45000, '2025-08-01', NOW).arrearsStatus, 'None');
});
test('arrearsStatus is None when not backdated', () => {
    assert.strictEqual(simulateBackdatedArrears(45000, 50000, '2025-10-01', NOW).arrearsStatus, 'None');
});
test('Cross-year: 2024-11 has year=2024, 2025-01 has year=2025', () => {
    const r = simulateBackdatedArrears(45000, 50000, '2024-11-01', NOW);
    const nov24 = r.arrearsMonths.find(m => m.monthStr === '2024-11');
    const jan25 = r.arrearsMonths.find(m => m.monthStr === '2025-01');
    assert.strictEqual(nov24.year, 2024);
    assert.strictEqual(jan25.year, 2025);
});

// ─── SECTION 12: Model Schema — Backdated Fields ─────────────────────────────
console.log('\n── Section 12: SalaryRevision Model — Backdated Schema Fields ──\n');

test('isBackdated defaults to false', () => {
    assert.strictEqual(SalaryRevision.schema.paths['isBackdated'].defaultValue, false);
});
test('arrearsAmount defaults to 0', () => {
    assert.strictEqual(SalaryRevision.schema.paths['arrearsAmount'].defaultValue, 0);
});
test('arrearsStatus enum: [None, Pending, Settled, Partial]', () => {
    assert.deepStrictEqual(SalaryRevision.schema.paths['arrearsStatus'].enumValues, ['None','Pending','Settled','Partial']);
});
test('arrearsStatus defaults to None', () => {
    assert.strictEqual(SalaryRevision.schema.paths['arrearsStatus'].defaultValue, 'None');
});
test('arrearsMonths array path exists', () => {
    assert.ok(SalaryRevision.schema.path('arrearsMonths'));
});
test('arrearsSettledAt field exists', () => {
    assert.ok(SalaryRevision.schema.paths['arrearsSettledAt']);
});
test('arrearsSettledRemark field exists', () => {
    assert.ok(SalaryRevision.schema.paths['arrearsSettledRemark']);
});

// ─── SECTION 13: getCTCForMonth Resolution Logic ──────────────────────────────
console.log('\n── Section 13: getCTCForMonth — Snapshot Resolution ─────────────\n');

const resolveCTCRevision = (revisions, month, year) => {
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 59, 999);
    let applicable = null;
    for (const rev of revisions) {
        if (new Date(rev.effectiveDate) <= lastDay) applicable = rev;
    }
    return applicable;
};

const revA = { effectiveDate: '2025-04-01', newMonthlyGross: 52000, label: 'April' };
const revB = { effectiveDate: '2025-08-01', newMonthlyGross: 55000, label: 'August' };
const sortedRevs = [revA, revB];

test('Jan 2025 (before any revision) → null', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 1, 2025), null); });
test('Mar 2025 (before any revision) → null', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 3, 2025), null); });
test('Apr 2025 → revA applies (52000)', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 4, 2025)?.newMonthlyGross, 52000); });
test('Jun 2025 (between revA and revB) → revA (52000)', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 6, 2025)?.newMonthlyGross, 52000); });
test('Jul 2025 → revA (52000)', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 7, 2025)?.newMonthlyGross, 52000); });
test('Aug 2025 → revB applies (55000)', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 8, 2025)?.newMonthlyGross, 55000); });
test('Oct 2025 (after both) → revB is latest applicable', () => { assert.strictEqual(resolveCTCRevision(sortedRevs, 10, 2025)?.label, 'August'); });
test('Slip for Aug uses 55000, not 52000', () => {
    const ctc = resolveCTCRevision(sortedRevs, 8, 2025);
    assert.strictEqual(ctc?.newMonthlyGross, 55000);
    assert.notStrictEqual(ctc?.newMonthlyGross, 52000);
});
test('Slip for Apr uses 52000 (first revision salary)', () => {
    assert.strictEqual(resolveCTCRevision(sortedRevs, 4, 2025)?.newMonthlyGross, 52000);
});

// ─── Results Summary ──────────────────────────────────────────────────────────
const total = passed + failed;
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║   📊 RESULTS: ${passed}/${total} tests passed${failed > 0 ? ` | ${failed} FAILED` : ' ✅ ALL PASSED'}` + ' '.repeat(Math.max(0, 32 - String(passed).length - String(total).length - (failed > 0 ? String(failed).length + 9 : 11))) + '║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ❌ ${r.name}`);
        console.log(`     ${r.error}`);
    });
    process.exit(1);
} else {
    console.log('🎉 All salary revision tests passed!\n');
    process.exit(0);
}
