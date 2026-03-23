const mongoose = require('mongoose');

async function setupPayroll() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;

    const admin = await db.collection('users').findOne({ role: 'Admin' });
    if (!admin) {
      console.log('--- ERROR: Admin not found ---');
      process.exit(1);
    }

    // 1. Setup Earnings & Deductions
    const types = [
      { name: "Basic Salary", type: "Earnings", allowanceType: "None", adminId: admin._id, status: "Active" },
      { name: "HRA", type: "Earnings", allowanceType: "Other", adminId: admin._id, status: "Active" },
      { name: "Special Allowance", type: "Earnings", allowanceType: "Special Allowance", adminId: admin._id, status: "Active" },
      { name: "Professional Tax", type: "Deductions", allowanceType: "None", adminId: admin._id, status: "Active" },
      { name: "PF (Provident Fund)", type: "Deductions", allowanceType: "None", adminId: admin._id, status: "Active" },
      { name: "ESI", type: "Deductions", allowanceType: "None", adminId: admin._id, status: "Active" }
    ];

    for (const t of types) {
      await db.collection('earningdeductiontypes').deleteOne({ name: t.name, adminId: admin._id });
      await db.collection('earningdeductiontypes').insertOne({ ...t, createdAt: new Date(), updatedAt: new Date() });
    }

    // 2. Setup Payroll Setting
    const setting = {
      adminId: admin._id,
      payslipFormat: "Format 1",
      displayRoundOffAmount: "Yes",
      weekStartDay: "Monday",
      defaultHraAmount: 2000,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('payrollsettings').deleteOne({ adminId: admin._id });
    await db.collection('payrollsettings').insertOne(setting);

    console.log('--- SUCCESS: PAYROLL DATA CREATED ---');
    console.log('1. Earnings: Basic Salary, HRA, Special Allowance');
    console.log('2. Deductions: PT, PF, ESI');
    console.log('3. Payroll Setting: Format 1, Mon Start, Round Off ON');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setupPayroll();
