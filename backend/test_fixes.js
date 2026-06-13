import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
dotenv.config();

// Import Models
import User from './models/User.Model.js';
import Offboarding from './models/Offboarding.Model.js';
import RetirementSetting from './models/RetirementSetting.Model.js';

// Import Controller functions
import { initiateOffboarding, getOffboardings, getOffboardingDetails, updateOffboarding, finalizeOffboarding } from './controllers/Offboarding.Controller.js';
import { bulkUpdateEmployeeIds } from './controllers/User.Controller.js';
import { getUpcomingRetirements } from './controllers/UserManagement.Controller.js';

const runTests = async () => {
    console.log("=== Starting Verification Tests ===");

    // 1. Verify Razorpay Hardcoded Keys Removal
    console.log("\n[Test 1] Verifying Razorpay Keys...");
    const authControllerContent = fs.readFileSync(path.resolve('controllers/Auth.Controller.js'), 'utf8');
    const packageControllerContent = fs.readFileSync(path.resolve('controllers/Package.Controller.js'), 'utf8');

    const testKey = 'rzp_test_Rya7YN2wKhxeQO';
    const testSecret = 'eevaOjQnOAz22VKp8Y4HdEyF';

    if (authControllerContent.includes(testKey) || authControllerContent.includes(testSecret)) {
        throw new Error("Razorpay hardcoded keys still exist in Auth.Controller.js!");
    }
    if (packageControllerContent.includes(testKey) || packageControllerContent.includes(testSecret)) {
        throw new Error("Razorpay hardcoded keys still exist in Package.Controller.js!");
    }
    console.log("✅ Razorpay hardcoded keys successfully removed from both controllers.");

    // Connect to DB for remaining tests
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ems');
    console.log("Connected to MongoDB.");

    // Clean up test data first
    await User.deleteMany({ email: { $regex: /@test-fix\.com$/ } });
    await Offboarding.deleteMany({});
    await RetirementSetting.deleteMany({});

    // Create Dummy Admins & Employees with unique phone numbers and unique employeeId values
    const admin1 = await User.create({
        name: 'Admin One',
        email: 'admin1@test-fix.com',
        phone: '1000000001',
        employeeId: 'EMP-ADM-1',
        password: 'password',
        role: 'Admin'
    });
    admin1.adminId = admin1._id;
    await admin1.save();

    const admin2 = await User.create({
        name: 'Admin Two',
        email: 'admin2@test-fix.com',
        phone: '1000000002',
        employeeId: 'EMP-ADM-2',
        password: 'password',
        role: 'Admin'
    });
    admin2.adminId = admin2._id;
    await admin2.save();

    const employee1 = await User.create({
        name: 'Employee One',
        email: 'emp1@test-fix.com',
        phone: '1000000003',
        employeeId: 'EMP-01',
        password: 'password',
        role: 'Employee',
        adminId: admin1._id,
        status: 'Active'
    });

    const employee2 = await User.create({
        name: 'Employee Two',
        email: 'emp2@test-fix.com',
        phone: '1000000004',
        employeeId: 'EMP-02',
        password: 'password',
        role: 'Employee',
        adminId: admin2._id,
        status: 'Active'
    });

    // helper mock res
    const mockResponse = () => {
        const res = {};
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data) => {
            res.jsonData = data;
            return res;
        };
        return res;
    };

    // 2. Verify Offboarding Multi-Tenant Isolation
    console.log("\n[Test 2] Verifying Offboarding Multi-Tenant Isolation...");
    
    // Admin 1 initiates offboarding for Employee 1
    const req1 = {
        user: admin1,
        body: {
            employeeId: employee1._id,
            exitType: 'Resignation',
            reason: 'Moving on',
            resignationDate: new Date(),
            lastWorkingDate: new Date()
        }
    };
    const res1 = mockResponse();
    await initiateOffboarding(req1, res1);
    if (res1.statusCode !== 201 || !res1.jsonData.success) {
        throw new Error(`Failed to initiate offboarding: ${JSON.stringify(res1.jsonData)}`);
    }
    const offboardingRecord = res1.jsonData.data;

    // Verify Offboarding has adminId
    if (offboardingRecord.adminId.toString() !== admin1._id.toString()) {
        throw new Error("Offboarding record is missing correct adminId");
    }
    console.log("✅ Offboarding successfully saved with adminId.");

    // Admin 2 tries to fetch Admin 1's offboarding records
    const reqListAdmin2 = {
        user: admin2,
        query: {}
    };
    const resListAdmin2 = mockResponse();
    await getOffboardings(reqListAdmin2, resListAdmin2);
    if (resListAdmin2.jsonData.data.length !== 0) {
        throw new Error("Admin 2 was able to view Admin 1's offboarding records!");
    }

    // Admin 1 fetches their own offboarding records
    const reqListAdmin1 = {
        user: admin1,
        query: {}
    };
    const resListAdmin1 = mockResponse();
    await getOffboardings(reqListAdmin1, resListAdmin1);
    if (resListAdmin1.jsonData.data.length !== 1) {
        throw new Error("Admin 1 could not view their own offboarding record!");
    }
    console.log("✅ getOffboardings correctly filters by adminId.");

    // Admin 2 tries to get details of Admin 1's offboarding record
    const reqDetailAdmin2 = {
        user: admin2,
        params: { id: offboardingRecord._id }
    };
    const resDetailAdmin2 = mockResponse();
    await getOffboardingDetails(reqDetailAdmin2, resDetailAdmin2);
    if (resDetailAdmin2.statusCode !== 404) {
        throw new Error("Admin 2 was able to view details of Admin 1's offboarding record!");
    }
    console.log("✅ getOffboardingDetails correctly blocks unauthorized tenant accesses (404).");

    // Admin 1 initiates offboarding for Employee 2 (who belongs to Admin 2)
    const reqInitBad = {
        user: admin1,
        body: {
            employeeId: employee2._id,
            exitType: 'Resignation'
        }
    };
    const resInitBad = mockResponse();
    await initiateOffboarding(reqInitBad, resInitBad);
    if (resInitBad.statusCode !== 400) {
        throw new Error("Admin 1 was able to initiate offboarding for Admin 2's employee!");
    }
    console.log("✅ initiateOffboarding blocks initiation for employees of other tenants.");

    // 3. Verify bulkUpdateEmployeeIds Tenant Isolation
    console.log("\n[Test 3] Verifying bulkUpdateEmployeeIds Multi-Tenant Isolation...");
    
    // Create another employee under admin 1 to simulate duplicate within tenant
    const employee3 = await User.create({
        name: 'Employee Three',
        email: 'emp3@test-fix.com',
        phone: '1000000005',
        employeeId: 'EMP-03',
        password: 'password',
        role: 'Employee',
        adminId: admin1._id,
        status: 'Active'
    });

    // Try to update Employee 3's ID to Employee 1's ID 'EMP-01' (Should fail due to duplicate)
    const reqBulkDup = {
        user: admin1,
        body: {
            updates: [{ id: employee3._id, employeeId: 'EMP-01' }]
        }
    };
    const resBulkDup = mockResponse();
    await bulkUpdateEmployeeIds(reqBulkDup, resBulkDup);
    if (resBulkDup.jsonData.results.success !== 0 || resBulkDup.jsonData.results.failed.length !== 1) {
        throw new Error("Duplicate employeeId was not rejected within tenant");
    }

    // Try to update Employee 3's ID to 'EMP-02' (which belongs to employee2 under Admin 2). This should SUCCEED because different tenants can have same IDs!
    const reqBulkCross = {
        user: admin1,
        body: {
            updates: [{ id: employee3._id, employeeId: 'EMP-02' }]
        }
    };
    const resBulkCross = mockResponse();
    await bulkUpdateEmployeeIds(reqBulkCross, resBulkCross);
    if (resBulkCross.jsonData.results.success !== 1) {
        throw new Error("Could not update to employeeId that is only used in a different tenant");
    }
    console.log("✅ bulkUpdateEmployeeIds correctly restricts duplicates per-tenant.");

    // 4. Verify getUpcomingRetirements using RetirementSetting
    console.log("\n[Test 4] Verifying Upcoming Retirements...");

    // Create RetirementSetting with defaultRetirementAge: 50
    await RetirementSetting.create({
        adminId: admin1._id,
        defaultRetirementAge: 50
    });

    // Create employee under admin1 turning 50 in 3 months
    const today = new Date();
    const dobRetiring = new Date(today.getFullYear() - 50, today.getMonth() + 3, today.getDate());
    const retiringEmp = await User.create({
        name: 'Retiring Emp',
        email: 'retire1@test-fix.com',
        phone: '1000000006',
        employeeId: 'EMP-RETIRE',
        password: 'password',
        role: 'Employee',
        adminId: admin1._id,
        dateOfBirth: dobRetiring,
        status: 'Active'
    });

    const reqRetire = {
        user: admin1
    };
    const resRetire = mockResponse();
    await getUpcomingRetirements(reqRetire, resRetire);
    if (resRetire.jsonData.retiringUsers.length !== 1) {
        throw new Error("Upcoming retirement calculation did not use RetirementSetting defaultRetirementAge!");
    }
    console.log("✅ getUpcomingRetirements correctly uses the RetirementSetting default age.");

    // Clean up test database records
    await User.deleteMany({ email: { $regex: /@test-fix\.com$/ } });
    await Offboarding.deleteMany({});
    await RetirementSetting.deleteMany({});

    console.log("\n✅ All tests passed successfully!");
    mongoose.disconnect();
};

runTests().catch(err => {
    console.error("\n❌ Test Suite Failed:", err);
    mongoose.disconnect();
    process.exit(1);
});
