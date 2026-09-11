import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config({ path: './.env' });

import User from '../models/User.Model.js';
import Company from '../models/Company.Model.js';
import Branch from '../models/Branch.Model.js';
import Department from '../models/Department.Model.js';
import Designation from '../models/Designation.Model.js';
import Shift from '../models/Shift.Model.js';
import LeaveGroup from '../models/LeaveGroup.Model.js';
import LeaveType from '../models/LeaveType.Model.js';
import SalaryGroup from '../models/SalaryGroup.Model.js';
import DocumentType from '../models/DocumentType.Model.js';

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Find or create Admin
    let admin = await User.findOne({ role: 'Admin', email: 'coban89859@fidhost.com' });
    if (!admin) {
      admin = await User.findOne({ role: 'Admin' });
    }

    if (!admin) {
      console.error('No Admin user found in database!');
      process.exit(1);
    }

    const adminId = admin._id;
    console.log(`Seeding data for Admin: ${admin.name} (${admin.email}) [${adminId}]`);

    // 2. Company Details
    let company = await Company.findOne({ adminId });
    if (!company) {
      company = new Company({
        adminId,
        companyName: 'Iflora Info Private Limited',
        website: 'https://iflorainfo.com',
        address: 'SG Highway, Corporate Park, Tower B, 5th Floor, Ahmedabad',
        companyEmail: 'info@iflorainfo.com',
        companyContact: '+91 9876543210',
        hrEmail: 'hr@iflorainfo.com',
        pincode: '380054',
        gstNumber: '24AAACI1234A1Z1',
        pan: 'AAACI1234A',
        tan: 'AHMI12345A',
        currency: '₹',
        ownerName: 'Jaimil Gorajiya',
        isActive: true,
        socials: {
          linkedin: 'https://linkedin.com/company/iflorainfo',
          facebook: 'https://facebook.com/iflorainfo',
          instagram: 'https://instagram.com/iflorainfo'
        }
      });
      await company.save();
      console.log('✅ Company details created');
    } else {
      company.companyName = 'Iflora Info Private Limited';
      company.companyEmail = 'info@iflorainfo.com';
      company.companyContact = '+91 9876543210';
      company.hrEmail = 'hr@iflorainfo.com';
      company.address = 'SG Highway, Corporate Park, Tower B, 5th Floor, Ahmedabad';
      await company.save();
      console.log('✅ Company details updated');
    }

    // 3. Branches
    const branchesData = [
      { branchName: 'Corporate Headquarters', branchCode: 'HQ-AHM', branchType: 'Metro city', latitude: 23.0225, longitude: 72.5714, radius: 300, address: 'SG Highway, AHM', order: 1 },
      { branchName: 'Tech Innovation Hub', branchCode: 'HUB-BLR', branchType: 'Metro city', latitude: 12.9716, longitude: 77.5946, radius: 250, address: 'Indiranagar, Bengaluru', order: 2 },
      { branchName: 'Regional Operations Center', branchCode: 'ROC-SUR', branchType: 'Non-Metro city', latitude: 21.1702, longitude: 72.8311, radius: 200, address: 'Ring Road, Surat', order: 3 }
    ];

    const createdBranches = [];
    for (const b of branchesData) {
      let branch = await Branch.findOne({ adminId, branchName: b.branchName });
      if (!branch) {
        branch = new Branch({ ...b, adminId });
        await branch.save();
      }
      createdBranches.push(branch);
    }
    console.log(`✅ ${createdBranches.length} Branches configured`);

    const defaultBranch = createdBranches[0];

    // 4. Departments
    const deptsData = [
      { name: 'Engineering & Technology', noticePeriodDays: 60, order: 1 },
      { name: 'Human Resources', noticePeriodDays: 30, order: 2 },
      { name: 'Finance & Accounts', noticePeriodDays: 45, order: 3 },
      { name: 'Sales & Marketing', noticePeriodDays: 30, order: 4 },
      { name: 'Operations & Customer Success', noticePeriodDays: 30, order: 5 }
    ];

    const createdDepts = [];
    for (const d of deptsData) {
      let dept = await Department.findOne({ adminId, name: d.name, branchId: defaultBranch._id });
      if (!dept) {
        dept = new Department({ ...d, adminId, branchId: defaultBranch._id });
        await dept.save();
      }
      createdDepts.push(dept);
    }
    console.log(`✅ ${createdDepts.length} Departments created`);

    // 5. Designations
    const desigsData = [
      { designationCode: 'ENG-01', designationName: 'Senior Software Engineer', designationAlias: 'Sr Dev', jobDescription: 'Develop scalable web & mobile apps' },
      { designationCode: 'ENG-02', designationName: 'Frontend Specialist', designationAlias: 'UI Lead', jobDescription: 'Build modern React interfaces' },
      { designationCode: 'HR-01', designationName: 'HR Operations Lead', designationAlias: 'HR Lead', jobDescription: 'Manage talent acquisition and employee relations' },
      { designationCode: 'FIN-01', designationName: 'Financial Analyst', designationAlias: 'Fin Analyst', jobDescription: 'Manage payroll and statutory tax filings' },
      { designationCode: 'MKT-01', designationName: 'Growth Marketing Manager', designationAlias: 'Mkt Lead', jobDescription: 'Drive organic & paid acquisition campaigns' }
    ];

    const createdDesigs = [];
    for (const des of desigsData) {
      let designation = await Designation.findOne({ adminId, designationName: des.designationName });
      if (!designation) {
        designation = new Designation({ ...des, adminId });
        await designation.save();
      }
      createdDesigs.push(designation);
    }
    console.log(`✅ ${createdDesigs.length} Designations created`);

    // 6. Shifts
    let defaultShift = await Shift.findOne({ adminId, shiftCode: 'SHIFT_GEN' });
    if (!defaultShift) {
      defaultShift = new Shift({
        shiftName: 'General Morning Shift (09:00 - 18:00)',
        shiftCode: 'SHIFT_GEN',
        adminId,
        createdBy: adminId,
        multiplePunchAllowed: true,
        hoursType: 'Full Shift Hours',
        maxLateInMinutes: 15,
        maxEarlyOutMinutes: 15,
        requireLateReason: false,
        requireEarlyOutReason: false,
        schedule: {
          monday: { shiftStart: '09:00', shiftEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' },
          tuesday: { shiftStart: '09:00', shiftEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' },
          wednesday: { shiftStart: '09:00', shiftEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' },
          thursday: { shiftStart: '09:00', shiftEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' },
          friday: { shiftStart: '09:00', shiftEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' },
          saturday: { shiftStart: '09:00', shiftEnd: '14:00' },
          sunday: {}
        }
      });
      await defaultShift.save();
    }
    console.log('✅ Default Shift created');

    // 7. Leave Group & Leave Types
    let defaultLeaveGroup = await LeaveGroup.findOne({ adminId, leaveGroupName: 'Standard Permanent Staff Group' });
    if (!defaultLeaveGroup) {
      defaultLeaveGroup = new LeaveGroup({
        adminId,
        leaveGroupName: 'Standard Permanent Staff Group',
        isPaidLeave: true,
        noOfPaidLeaves: 18,
        leaveAllocationType: 'Yearly'
      });
      await defaultLeaveGroup.save();
    }

    const leaveTypes = ['Casual Leave (CL)', 'Sick Leave (SL)', 'Privilege Leave (PL)'];
    for (const ltName of leaveTypes) {
      let lt = await LeaveType.findOne({ adminId, name: ltName });
      if (!lt) {
        lt = new LeaveType({ adminId, name: ltName, days: 12, leaveGroup: defaultLeaveGroup._id });
        await lt.save();
      }
    }
    console.log('✅ Leave Group & Leave Types created');

    // 8. Salary Group
    let defaultSalaryGroup = await SalaryGroup.findOne({ adminId, groupName: 'Standard IT Grade A' });
    if (!defaultSalaryGroup) {
      defaultSalaryGroup = new SalaryGroup({
        adminId,
        groupName: 'Standard IT Grade A',
        payrollFrequency: 'Monthly Pay',
        fixedDays: 26,
        status: 'Active'
      });
      await defaultSalaryGroup.save();
    }
    console.log('✅ Salary Group created');

    // 9. Document Types
    const docTypesData = [
      { name: 'Aadhaar Card', shortName: 'AADHAAR', documentNumberRequired: 'Yes' },
      { name: 'PAN Card', shortName: 'PAN', documentNumberRequired: 'Yes' },
      { name: 'Passport', shortName: 'PASSPORT', documentNumberRequired: 'Yes', expiryDateRequired: 'Yes' },
      { name: 'Higher Secondary / Degree Certificate', shortName: 'DEGREE' }
    ];

    for (const dt of docTypesData) {
      let docType = await DocumentType.findOne({ adminId, name: dt.name });
      if (!docType) {
        docType = new DocumentType({ ...dt, adminId, status: true });
        await docType.save();
      }
    }
    console.log('✅ Document Types created');

    // 10. Fake Employees Data
    const hashedPassword = await bcrypt.hash('Password@123', 10);

    const fakeEmployees = [
      {
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'employee.test@fidhost.com',
        phone: '9876543210',
        employeeId: 'EMP1001',
        designation: 'Senior Software Engineer',
        department: 'Engineering & Technology',
        branch: 'Corporate Headquarters',
        dateJoined: new Date('2023-01-15'),
        status: 'Active',
        gender: 'Male',
        requireSelfie: true
      },
      {
        name: 'Priya Sharma',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@iflorainfo.com',
        phone: '9876543211',
        employeeId: 'EMP1002',
        designation: 'Frontend Specialist',
        department: 'Engineering & Technology',
        branch: 'Corporate Headquarters',
        dateJoined: new Date('2023-03-01'),
        status: 'Active',
        gender: 'Female',
        requireSelfie: true
      },
      {
        name: 'Rohan Patel',
        firstName: 'Rohan',
        lastName: 'Patel',
        email: 'rohan.patel@iflorainfo.com',
        phone: '9876543212',
        employeeId: 'EMP1003',
        designation: 'HR Operations Lead',
        department: 'Human Resources',
        branch: 'Corporate Headquarters',
        dateJoined: new Date('2022-06-10'),
        status: 'Active',
        gender: 'Male',
        requireSelfie: false
      },
      {
        name: 'Ananya Verma',
        firstName: 'Ananya',
        lastName: 'Verma',
        email: 'ananya.verma@iflorainfo.com',
        phone: '9876543213',
        employeeId: 'EMP1004',
        designation: 'Financial Analyst',
        department: 'Finance & Accounts',
        branch: 'Corporate Headquarters',
        dateJoined: new Date('2023-09-15'),
        status: 'Active',
        gender: 'Female',
        requireSelfie: true
      },
      {
        name: 'Vikram Joshi',
        firstName: 'Vikram',
        lastName: 'Joshi',
        email: 'vikram.joshi@iflorainfo.com',
        phone: '9876543214',
        employeeId: 'EMP1005',
        designation: 'Growth Marketing Manager',
        department: 'Sales & Marketing',
        branch: 'Tech Innovation Hub',
        dateJoined: new Date('2024-01-10'),
        status: 'Active',
        gender: 'Male',
        requireSelfie: true
      },
      {
        name: 'Neha Gupta',
        firstName: 'Neha',
        lastName: 'Gupta',
        email: 'neha.gupta@iflorainfo.com',
        phone: '9876543215',
        employeeId: 'EMP1006',
        designation: 'Frontend Specialist',
        department: 'Engineering & Technology',
        branch: 'Tech Innovation Hub',
        dateJoined: new Date('2024-02-01'),
        status: 'Active',
        gender: 'Female',
        requireSelfie: true
      }
    ];

    for (const empData of fakeEmployees) {
      let user = await User.findOne({ adminId, email: empData.email });
      if (!user) {
        user = new User({
          ...empData,
          password: hashedPassword,
          role: 'Employee',
          countryCode: '+91',
          adminId,
          leaveGroup: defaultLeaveGroup._id,
          workSetup: {
            location: empData.branch,
            shift: defaultShift._id,
            salaryGroup: defaultSalaryGroup._id,
            mode: 'Office'
          }
        });
        await user.save();
        console.log(`✅ Created Employee: ${user.name} (${user.email})`);
      } else {
        user.branch = empData.branch;
        user.department = empData.department;
        user.designation = empData.designation;
        user.status = 'Active';
        user.leaveGroup = defaultLeaveGroup._id;
        user.workSetup = {
          location: empData.branch,
          shift: defaultShift._id,
          salaryGroup: defaultSalaryGroup._id,
          mode: 'Office'
        };
        await user.save();
        console.log(`✅ Updated Employee: ${user.name} (${user.email})`);
      }
    }

    console.log('\n🎉 ALL FAKE DATA SEEDED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
