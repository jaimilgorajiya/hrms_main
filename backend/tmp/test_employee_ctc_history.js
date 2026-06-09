import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import SalaryGroup from '../models/SalaryGroup.Model.js';
import { upsertEmployeeCTC } from '../controllers/EmployeeCTC.Controller.js';

const runTest = async () => {
    try {
        console.log('Connecting to database...');
        await connectDB();

        // 1. Find or create dummy Admin and Employee
        console.log('Finding or creating test data...');
        let adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            adminUser = await User.create({
                name: 'Test Admin',
                email: 'test_admin_history@example.com',
                password: 'password123',
                role: 'Admin'
            });
        }

        let employeeUser = await User.findOne({ role: 'Employee', adminId: adminUser._id });
        if (!employeeUser) {
            employeeUser = await User.create({
                name: 'Test Employee History',
                email: 'test_emp_history@example.com',
                password: 'password123',
                role: 'Employee',
                adminId: adminUser._id,
                branch: 'Headquarters',
                department: 'Engineering',
                designation: 'Software Engineer'
            });
        }

        let salaryGroup = await SalaryGroup.findOne({ adminId: adminUser._id });
        if (!salaryGroup) {
            salaryGroup = await SalaryGroup.create({
                groupName: 'Engineering Standard Group',
                adminId: adminUser._id,
                workingDaysType: 'Fixed Working Days',
                fixedDays: 26
            });
        }

        // Ensure clean start
        await EmployeeCTC.deleteOne({ employeeId: employeeUser._id });

        // MOCK Response helper
        const createMockRes = () => {
            return {
                statusCode: 200,
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.data = data;
                    return this;
                }
            };
        };

        // --- FIRST UPSERT (Starting CTC) ---
        console.log('1. Configuring starting CTC (Monthly Gross = ₹10,000)...');
        const req1 = {
            user: { _id: adminUser._id },
            body: {
                employeeId: employeeUser._id.toString(),
                salaryGroup: salaryGroup._id.toString(),
                monthlyGross: 10000,
                effectiveDate: '2026-01-01',
                status: 'Active'
            }
        };
        const res1 = createMockRes();
        await upsertEmployeeCTC(req1, res1);

        // --- SECOND UPSERT (Increment) ---
        console.log('2. Configuring salary increment (Monthly Gross = ₹30,000)...');
        const req2 = {
            user: { _id: adminUser._id },
            body: {
                employeeId: employeeUser._id.toString(),
                salaryGroup: salaryGroup._id.toString(),
                monthlyGross: 30000,
                effectiveDate: '2026-06-01',
                status: 'Active'
            }
        };
        const res2 = createMockRes();
        await upsertEmployeeCTC(req2, res2);

        // --- VERIFY DB DATA ---
        console.log('3. Verifying database record...');
        const record = await EmployeeCTC.findOne({ employeeId: employeeUser._id });
        if (!record) {
            throw new Error('CTC record not found!');
        }

        console.log('Current root-level values:');
        console.log(`- Annual CTC: ₹${record.annualCTC} (expected: ₹360,000)`);
        console.log(`- Monthly Gross: ₹${record.monthlyGross} (expected: ₹30,000)`);
        console.log(`- Increment Percentage: ${record.incrementPercentage}% (expected: 200%)`);
        console.log(`- Effective Date: ${record.effectiveDate.toISOString().split('T')[0]} (expected: 2026-06-01)`);
        
        if (record.monthlyGross !== 30000 || record.incrementPercentage !== 200) {
            throw new Error('Root level fields are incorrect after increment!');
        }
        console.log('✅ Current CTC details are correct!');

        console.log('History tracking checks:');
        console.log(`- History length: ${record.history.length} (expected: 1)`);
        if (record.history.length !== 1) {
            throw new Error('History list size must be exactly 1!');
        }

        const historyItem = record.history[0];
        console.log(`- Historical Annual CTC: ₹${historyItem.annualCTC} (expected: ₹120,000)`);
        console.log(`- Historical Effective Date: ${historyItem.effectiveDate.toISOString().split('T')[0]} (expected: 2026-01-01)`);
        console.log(`- Historical End Date: ${historyItem.endDate.toISOString().split('T')[0]} (expected: 2026-05-31)`);
        console.log(`- Historical Designation snapshot: ${historyItem.designation} (expected: Software Engineer)`);
        console.log(`- Historical Salary Group snapshot: ${historyItem.salaryGroup} (expected: Engineering Standard Group)`);

        const expectedDesignation = employeeUser.designation || '';
        if (historyItem.annualCTC !== 120000 || historyItem.designation !== expectedDesignation) {
            throw new Error(`Historical archived values are incorrect! Expected annualCTC: 120000, got: ${historyItem.annualCTC}; Expected designation: ${expectedDesignation}, got: ${historyItem.designation}`);
        }
        console.log('✅ Historical snapshot fields are correct!');

        // Cleanup
        await EmployeeCTC.deleteOne({ employeeId: employeeUser._id });
        if (employeeUser.email === 'test_emp_history@example.com') {
            await User.deleteOne({ _id: employeeUser._id });
        }
        if (adminUser.email === 'test_admin_history@example.com') {
            await User.deleteOne({ _id: adminUser._id });
        }
        
        console.log('🎉 ALL HISTORY TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ History test failed:', err);
        process.exit(1);
    }
};

runTest();
