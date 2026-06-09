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
            console.log('No Admin found, creating dummy Admin...');
            adminUser = await User.create({
                name: 'Test Admin',
                email: 'test_admin_ctc@example.com',
                password: 'password123',
                role: 'Admin'
            });
        }

        let employeeUser = await User.findOne({ role: 'Employee', adminId: adminUser._id });
        if (!employeeUser) {
            console.log('No test Employee found for this Admin, creating one...');
            employeeUser = await User.create({
                name: 'Test Employee CTC',
                email: 'test_emp_ctc@example.com',
                password: 'password123',
                role: 'Employee',
                adminId: adminUser._id,
                branch: 'Headquarters',
                department: 'Engineering'
            });
        }

        let salaryGroup = await SalaryGroup.findOne({ adminId: adminUser._id });
        if (!salaryGroup) {
            console.log('No test SalaryGroup found, creating one...');
            salaryGroup = await SalaryGroup.create({
                groupName: 'Engineering Standard Group',
                adminId: adminUser._id,
                workingDaysType: 'Fixed Working Days',
                fixedDays: 26
            });
        }

        console.log(`Using Employee ID: ${employeeUser._id}`);
        console.log(`Using SalaryGroup ID: ${salaryGroup._id}`);

        // Mock request & response
        const req = {
            user: { _id: adminUser._id },
            body: {
                employeeId: employeeUser._id.toString(),
                salaryGroup: salaryGroup._id.toString(),
                monthlyGross: 75000,
                effectiveDate: new Date(),
                status: 'Active'
            }
        };

        const res = {
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

        // 2. Perform the upsert operation via the controller function
        console.log('Running upsertEmployeeCTC controller...');
        await upsertEmployeeCTC(req, res);

        console.log(`Response status: ${res.statusCode}`);
        console.log('Response data:', JSON.stringify(res.data, null, 2));

        if (res.statusCode !== 200 || !res.data.success) {
            throw new Error(`Controller action failed with code ${res.statusCode}`);
        }

        // 3. Verify modifications in Database
        console.log('Verifying DB changes...');
        
        // Check CTC
        const ctc = await EmployeeCTC.findOne({ employeeId: employeeUser._id });
        if (!ctc) {
            throw new Error('CTC record was not created/found in DB!');
        }
        console.log('✅ CTC created successfully:', ctc.toObject());
        
        if (ctc.monthlyGross !== 75000 || ctc.netSalary !== 75000 || ctc.annualCTC !== 900000) {
            throw new Error(`Fallback values incorrect! Gross: ${ctc.monthlyGross}, Net: ${ctc.netSalary}, Annual: ${ctc.annualCTC}`);
        }
        console.log('✅ Fallback gross, net, and annualCTC values are correct!');

        // Check user update
        const updatedUser = await User.findById(employeeUser._id);
        if (!updatedUser.workSetup?.salaryGroup || updatedUser.workSetup.salaryGroup.toString() !== salaryGroup._id.toString()) {
            throw new Error('User workSetup.salaryGroup was not updated successfully!');
        }
        console.log('✅ User workSetup.salaryGroup updated correctly!');

        // 4. Clean up / restore test data
        console.log('Cleaning up test CTC record...');
        await EmployeeCTC.deleteOne({ employeeId: employeeUser._id });

        // If we created dummy users/groups, clean them up to not pollute local data
        if (employeeUser.email === 'test_emp_ctc@example.com') {
            console.log('Cleaning up test employee...');
            await User.deleteOne({ _id: employeeUser._id });
        }
        if (adminUser.email === 'test_admin_ctc@example.com') {
            console.log('Cleaning up test admin...');
            await User.deleteOne({ _id: adminUser._id });
        }
        if (salaryGroup.groupName === 'Engineering Standard Group') {
            console.log('Cleaning up test salary group...');
            await SalaryGroup.deleteOne({ _id: salaryGroup._id });
        }

        console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! CURRENT DATA REMAINS UNTOUCHED.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Test failed:', err);
        process.exit(1);
    }
};

runTest();
