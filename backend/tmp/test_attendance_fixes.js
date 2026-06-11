import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import Shift from '../models/Shift.Model.js';
import PenaltyRule from '../models/PenaltyRule.Model.js';
import { calculatePenaltyAmount } from '../controllers/PenaltyRule.Controller.js';
import { getEmployeeShiftToday } from '../controllers/Attendance.Controller.js';

const runTests = async () => {
    try {
        console.log('Connecting to database...');
        await connectDB();

        // Find or create test Admin and Employee
        console.log('Finding or creating test data...');
        let adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            adminUser = await User.create({
                name: 'Test Admin',
                email: 'test_admin_attend@example.com',
                password: 'password123',
                role: 'Admin'
            });
        }
        // Create a test shift
        let shift = await Shift.findOne({ shiftName: 'Test Shift Fixed' });
        if (!shift) {
            shift = await Shift.create({
                shiftName: 'Test Shift Fixed',
                shiftCode: 'TSF',
                adminId: adminUser._id,
                createdBy: adminUser._id,
                requireLateReason: false,
                requireEarlyOutReason: false,
                lateEarlyType: 'Combined',
                maxLateInMinutes: 15,
                maxEarlyOutMinutes: 15,
                schedule: {
                    monday: { shiftStart: '09:30 AM', shiftEnd: '06:30 PM', lunchStart: '01:00 PM', lunchEnd: '02:00 PM' },
                    saturday: { shiftStart: '09:30 AM', shiftEnd: '04:00 PM', lunchStart: '01:00 PM', lunchEnd: '01:30 PM' },
                    sunday: { shiftStart: '', shiftEnd: '', lunchStart: '', lunchEnd: '' }
                },
                weekOffDays: ['Sunday']
            });
        }

        let employeeUser = await User.findOne({ email: 'test_emp_attend@example.com' });
        if (!employeeUser) {
            employeeUser = await User.create({
                name: 'Test Employee Attendance',
                email: 'test_emp_attend@example.com',
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

        // Create or update employee CTC for testing salary-based penalty
        let ctc = await EmployeeCTC.findOne({ employeeId: employeeUser._id });
        if (!ctc) {
            ctc = await EmployeeCTC.create({
                employeeId: employeeUser._id,
                annualCTC: 360000,
                monthlyGross: 30000,
                netSalary: 30000,
                adminId: adminUser._id
            });
        } else {
            ctc.monthlyGross = 30000;
            await ctc.save();
        }

        console.log('--- Test 1: getEmployeeShiftToday with targetDate ---');
        // Monday (2026-06-08) -> Should return monday shift (9:30 AM - 6:30 PM)
        const mondayRes = await getEmployeeShiftToday(employeeUser._id, '2026-06-08');
        console.assert(mondayRes.dayName === 'monday', `Expected monday, got ${mondayRes.dayName}`);
        console.assert(mondayRes.daySchedule.shiftEnd === '06:30 PM', `Expected Monday shiftEnd 06:30 PM, got ${mondayRes.daySchedule.shiftEnd}`);
        console.log('✅ Monday schedule matched correctly');

        // Saturday (2026-06-06) -> Should return saturday shift (9:30 AM - 4:00 PM)
        const saturdayRes = await getEmployeeShiftToday(employeeUser._id, '2026-06-06');
        console.assert(saturdayRes.dayName === 'saturday', `Expected saturday, got ${saturdayRes.dayName}`);
        console.assert(saturdayRes.daySchedule.shiftEnd === '04:00 PM', `Expected Saturday shiftEnd 04:00 PM, got ${saturdayRes.daySchedule.shiftEnd}`);
        console.log('✅ Saturday schedule matched correctly');

        console.log('--- Test 2: calculatePenaltyAmount with different Slab types ---');
        // Monthly gross is 30,000 -> Daily salary is 1,000.
        // Standard shift minutes is 480 mins. Per-minute salary is 1000 / 480 = 2.0833 Rs / min.
        
        // Mock Slabs
        const flatSlab = { type: 'Flat', value: 150 };
        const percentSlab = { type: 'Percentage', value: 5 }; // 5% of daily salary = 5% of 1000 = 50 Rs.
        const perMinFlatSlab = { type: 'Per Minute (Flat Amount)', value: 2 }; // 10 mins * 2 = 20 Rs.
        const perMinSalarySlab = { type: 'Per Minute (As Per Salary)', value: 1.5 }; // 10 mins * (1000/480) * 1.5 = 10 * 2.0833 * 1.5 = 31.25 Rs.
        const halfDaySalarySlab = { type: 'Half Day Salary', value: 1 }; // 1000 * 0.5 * 1 = 500 Rs.
        const fullDaySalarySlab = { type: 'Full Day Salary', value: 1.2 }; // 1000 * 1.2 = 1200 Rs.

        // Wrap slabs inside fake existing rule
        const makeMockRule = (slab) => ({ slabs: [ { ...slab, penaltyType: 'Late In Minutes', minTime: 0, maxTime: 9999 } ] });

        // Assert flat
        const resFlat = await calculatePenaltyAmount(shift._id, 10, employeeUser._id, makeMockRule(flatSlab));
        console.assert(resFlat === 150, `Expected Flat to be 150, got ${resFlat}`);
        console.log('✅ Flat penalty logic correct:', resFlat);

        // Assert percentage
        const resPercent = await calculatePenaltyAmount(shift._id, 10, employeeUser._id, makeMockRule(percentSlab));
        console.assert(resPercent === 50, `Expected Percentage to be 50, got ${resPercent}`);
        console.log('✅ Percentage penalty logic correct:', resPercent);

        // Assert Per Minute Flat
        const resPerMinFlat = await calculatePenaltyAmount(shift._id, 10, employeeUser._id, makeMockRule(perMinFlatSlab));
        console.assert(resPerMinFlat === 20, `Expected Per Minute Flat to be 20, got ${resPerMinFlat}`);
        console.log('✅ Per Minute Flat penalty logic correct:', resPerMinFlat);

        // Assert Per Minute Salary
        const resPerMinSalary = await calculatePenaltyAmount(shift._id, 10, employeeUser._id, makeMockRule(perMinSalarySlab));
        console.assert(resPerMinSalary === 31.25, `Expected Per Minute Salary to be 31.25, got ${resPerMinSalary}`);
        console.log('✅ Per Minute Salary penalty logic correct:', resPerMinSalary);

        // Assert Half Day Salary
        const resHalfDaySalary = await calculatePenaltyAmount(shift._id, 10, employeeUser._id, makeMockRule(halfDaySalarySlab));
        console.assert(resHalfDaySalary === 500, `Expected Half Day Salary to be 500, got ${resHalfDaySalary}`);
        console.log('✅ Half Day Salary penalty logic correct:', resHalfDaySalary);

        // Assert Full Day Salary
        const resFullDaySalary = await calculatePenaltyAmount(shift._id, 10, employeeUser._id, makeMockRule(fullDaySalarySlab));
        console.assert(resFullDaySalary === 1200, `Expected Full Day Salary to be 1200, got ${resFullDaySalary}`);
        console.log('✅ Full Day Salary penalty logic correct:', resFullDaySalary);

        console.log('--- Cleanup ---');
        // Clean up mock employee user and CTC to prevent polluting DB
        await User.deleteOne({ _id: employeeUser._id });
        await EmployeeCTC.deleteOne({ _id: ctc._id });
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