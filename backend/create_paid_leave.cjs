const mongoose = require('mongoose');

async function createPaidLeaveGroup() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;

    const admin = await db.collection('users').findOne({ role: 'Admin' });
    if (!admin) {
      console.log('--- ERROR: Admin not found ---');
      process.exit(1);
    }

    const paidLeaveGroup = {
      leaveGroupName: "Corporate Paid Leave Policy",
      leaveBalanceVisibility: "Default (Multiple of 0.5)",
      generatePenaltyOnLeaveRequestPending: "No",
      isPaidLeave: true,
      leaveAllocationType: "Yearly",
      noOfPaidLeaves: 18,
      leaveAppliedFormula: "Multiple of 0.5",
      leaveFrequency: "Annually",
      leaveCalculation: "Manual Calculation",
      leaveRestrictions: "No",
      status: "Active",
      adminId: admin._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clean up old ones for testing simplicity
    await db.collection('leavegroups').deleteMany({ leaveGroupName: paidLeaveGroup.leaveGroupName });
    await db.collection('leavegroups').insertOne(paidLeaveGroup);

    console.log('--- SUCCESS: PAID LEAVE GROUP CREATED ---');
    console.log('Policy Name: Corporate Paid Leave Policy');
    console.log('Annual Paid Leaves: 18');
    console.log('isPaidLeave: true');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createPaidLeaveGroup();
