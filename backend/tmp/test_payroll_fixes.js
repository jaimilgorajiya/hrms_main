import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import Shift from '../models/Shift.Model.js';
import Payout from '../models/Payout.Model.js';
import SalarySlip from '../models/SalarySlip.Model.js';
import { initiatePayout } from '../controllers/Payroll.Controller.js';
import { createSalarySlip } from '../controllers/SalarySlip.Controller.js';
import { getEmployeeMonthlySummary } from '../controllers/Attendance.Controller.js';

const runTests = async () => {
    try {
        console.log('Connecting to database...');
        await connectDB();

        console.log('Finding or creating test data...');
        let adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            adminUser = await User.create({
                name: 'Test Admin',
                email: 'test_admin_payroll@example.com',
                password: 'password123',
                role: 'Admin'
            });
        }

        let shift = await Shift.findOne({ shiftName: 'Test Shift Payroll' });
        if (!shift) {
            shift = await Shift.create({
                shiftName: 'Test Shift Payroll',
                shiftCode: 'TSFP',
                adminId: adminUser._id,
                createdBy: adminUser._id,
                requireLateReason: false,
                requireEarlyOutReason: false,
                lateEarlyType: 'Combined',
                maxLateInMinutes: 15,
                maxEarlyOutMinutes: 15,
                schedule: {
                    monday: { shiftStart: '09:30 AM', shiftEnd: '06:30 PM', lunchStart: '01:00 PM', lunchEnd: '02:00 PM' }
                },
                weekOffDays: ['Sunday']
            });
        }

        let employeeUser = await User.findOne({ email: 'test_emp_payroll@example.com' });
        if (!employeeUser) {
            employeeUser = await User.create({
                name: 'Test Employee Payroll',
                email: 'test_emp_payroll@example.com',
                password: 'password123',
                role: 'Employee',
                adminId: adminUser._id,
                workSetup: {
                    shift: shift._id
                }
            });
        } else {
            employeeUser.workSetup = { shift: shift._id };
            await employeeUser.save();
        }

        let ctc = await EmployeeCTC.findOne({ employeeId: employeeUser._id });
        if (!ctc) {
            ctc = await EmployeeCTC.create({
                employeeId: employeeUser._id,
                annualCTC: 360000,
                monthlyGross: 30000,
                netSalary: 30000,
                earnings: [
                    { componentName: 'Basic Salary', amount: 18000 },
                    { componentName: 'HRA', amount: 12000 }
                ],
                deductions: [
                    { componentName: 'PF', amount: 1800 }
                ],
                adminId: adminUser._id
            });
        } else {
            ctc.monthlyGross = 30000;
            ctc.netSalary = 30000;
            ctc.earnings = [
                { componentName: 'Basic Salary', amount: 18000 },
                { componentName: 'HRA', amount: 12000 }
            ];
            ctc.deductions = [
                { componentName: 'PF', amount: 1800 }
            ];
            await ctc.save();
        }

        // Helper mock response
        const makeMockResponse = () => ({
            statusCode: 200,
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.data = data; return this; }
        });

        console.log('--- Test 1: initiatePayout snaps CTC config ---');
        // Let's call initiatePayout
        const initReq = {
            user: { _id: adminUser._id },
            body: {
                employeeId: employeeUser._id,
                month: '2026-06',
                attendance: { present: 22, halfDay: 0, absent: 4, weekOff: 4, holiday: 0, paidLeave: 0, unpaidLeave: 0 },
                baseSalary: 30000,
                systemAccrued: 26000, // worked 22 + 4 weekOff = 26 days. 26/30 * 30000 = 26000 gross.
                penalties: { total: 0, lateIn: 0, earlyOut: 0 },
                adjustments: { bonus: { amount: 0, reason: '' }, deduction: { amount: 0, reason: '' } },
                extraDayBenefit: { days: 0, amount: 0 },
                finalPayout: 26000
            }
        };
        const initRes = makeMockResponse();
        await initiatePayout(initReq, initRes);

        console.assert(initRes.statusCode === 200, `Expected 200, got ${initRes.statusCode}`);
        console.assert(initRes.data.success === true, 'initiatePayout failed');

        // Verify DB payout snapshot
        const payout = await Payout.findOne({ employeeId: employeeUser._id, month: '2026-06' });
        console.assert(payout !== null, 'Payout not found in DB');
        console.assert(payout.joiningMonthlyGross === 30000, `Expected monthly gross 30000, got ${payout.joiningMonthlyGross}`);
        console.assert(payout.earnings.length === 2, `Expected 2 earnings components, got ${payout.earnings.length}`);
        console.assert(payout.earnings[0].componentName === 'Basic Salary', `Expected first component Basic Salary, got ${payout.earnings[0].componentName}`);
        console.assert(Math.round(payout.earnings[0].calculatedAmount) === 15600, `Expected Basic Salary calculations scaled to 15600 (26000/30000 * 18000), got ${payout.earnings[0].calculatedAmount}`);
        console.assert(payout.deductions.length === 1, `Expected 1 deduction components, got ${payout.deductions.length}`);
        console.assert(Math.round(payout.deductions[0].amount) === 1560, `Expected PF deduction scaled to 1560, got ${payout.deductions[0].amount}`);
        console.log('✅ Payout snapshot tests passed successfully');

        console.log('--- Test 2: getEmployeeMonthlySummary summary numbers ---');
        const summaryReq = {
            query: { employeeId: employeeUser._id.toString(), month: '2026-06' }
        };
        const summaryRes = makeMockResponse();
        await getEmployeeMonthlySummary(summaryReq, summaryRes);

        console.assert(summaryRes.statusCode === 200, `Expected 200, got ${summaryRes.statusCode}`);
        console.assert(summaryRes.data.success === true, 'getEmployeeMonthlySummary failed');
        console.assert(summaryRes.data.summary.present === 0, `Expected 0 present (no records created), got ${summaryRes.data.summary.present}`);
        console.log('✅ getEmployeeMonthlySummary endpoint tests passed');

        console.log('--- Test 3: createSalarySlip calculation verification & security validation ---');
        // Scenario A: Valid payload parameters
        // monthlyGross = 30000. monthWorkingDays = 30. employeeWorkingDays = 26.
        // perDaySalary = 1000. paidDays = 26. thisMonthGross = 26000.
        // earnings: Basic (15600), HRA (10400). totalEarnings = 26000.
        // deductions: PF (1560). totalDeductions = 1560.
        // netSalary = 24440.
        const validSlipReq = {
            user: { _id: adminUser._id },
            body: {
                employeeId: employeeUser._id.toString(),
                month: 6,
                year: 2026,
                monthWorkingDays: 30,
                employeeWorkingDays: 26,
                paidLeave: 0,
                unpaidLeave: 0,
                extraDays: 0,
                extraDaysPaid: 0,
                paidHolidays: 0,
                paidWeekOff: 0,
                otherEarnings: 0,
                otherDeduction: 0,
                netSalary: 24200
            }
        };
        const validSlipRes = makeMockResponse();
        await createSalarySlip(validSlipReq, validSlipRes);

        if (validSlipRes.statusCode !== 200) {
            console.log('ERROR payload:', validSlipRes.data);
        }
        console.assert(validSlipRes.statusCode === 200, `Expected 200, got ${validSlipRes.statusCode}`);
        console.assert(validSlipRes.data.success === true, 'CreateSalarySlip failed for valid parameters');

        const savedSlip = await SalarySlip.findOne({ employeeId: employeeUser._id, month: 6, year: 2026 });
        console.assert(savedSlip !== null, 'SalarySlip not saved in DB');
        console.assert(savedSlip.netSalary === 24200, `Expected net salary 24200, got ${savedSlip.netSalary}`);
        console.log('✅ Valid salary slip creation verified and saved successfully');

        // Scenario B: Invalid/Tampered payload (Security Check)
        const tamperedSlipReq = {
            user: { _id: adminUser._id },
            body: {
                employeeId: employeeUser._id.toString(),
                month: 6,
                year: 2026,
                monthWorkingDays: 30,
                employeeWorkingDays: 26,
                paidLeave: 0,
                unpaidLeave: 0,
                extraDays: 0,
                extraDaysPaid: 0,
                paidHolidays: 0,
                paidWeekOff: 0,
                otherEarnings: 0,
                otherDeduction: 0,
                netSalary: 500000 // ⚠️ TAMPERED: Claims to have 5 lakh salary!
            }
        };
        const tamperedSlipRes = makeMockResponse();
        await createSalarySlip(tamperedSlipReq, tamperedSlipRes);

        console.assert(tamperedSlipRes.statusCode === 400, `Expected 400 for tampered value, got ${tamperedSlipRes.statusCode}`);
        console.assert(tamperedSlipRes.data.success === false, 'Security check failed: did not reject tampered netSalary');
        console.assert(tamperedSlipRes.data.message.includes('manipulation blocked'), `Expected block warning, got: ${tamperedSlipRes.data.message}`);
        console.log('✅ Tampered payload security block verified successfully');

        console.log('--- Cleanup ---');
        await User.deleteOne({ _id: employeeUser._id });
        await EmployeeCTC.deleteOne({ _id: ctc._id });
        await Payout.deleteOne({ _id: payout._id });
        await SalarySlip.deleteOne({ _id: savedSlip._id });
        console.log('✅ Cleanup successful.');

        console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
        mongoose.connection.close();
        process.exit(0);
    } catch (e) {
        console.error('❌ Test failed with error:', e);
        if (mongoose.connection.readyState !== 0) {
            mongoose.connection.close();
        }
        process.exit(1);
    }
};

runTests();
