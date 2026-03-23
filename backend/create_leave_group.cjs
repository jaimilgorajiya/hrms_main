const mongoose = require('mongoose');

async function createLeaveGroup() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;

    const admin = await db.collection('users').findOne({ role: 'Admin' });
    const sl = await db.collection('leavetypes').findOne({ shortName: 'SL', adminId: admin._id });
    const cl = await db.collection('leavetypes').findOne({ shortName: 'CL', adminId: admin._id });
    const pl = await db.collection('leavetypes').findOne({ shortName: 'PL', adminId: admin._id });

    if (!admin || !sl || !cl || !pl) {
      console.log('--- ERROR: Prerequisites not found ---');
      process.exit(1);
    }

    const leaveGroup = {
      leaveGroupName: "Standard Policy (2026)",
      leaveRules: [
        {
          leaveType: sl._id,
          leaveAllocated: 12,
          carryForward: 0,
          maxCarryForward: 0
        },
        {
          leaveType: cl._id,
          leaveAllocated: 12,
          carryForward: 0,
          maxCarryForward: 0
        },
        {
          leaveType: pl._id,
          leaveAllocated: 15,
          carryForward: 5,
          maxCarryForward: 30
        }
      ],
      adminId: admin._id,
      status: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Clean up old ones for testing simplicity
    await db.collection('leavegroups').deleteMany({ leaveGroupName: leaveGroup.leaveGroupName });
    await db.collection('leavegroups').insertOne(leaveGroup);

    console.log('--- SUCCESS: LEAVE POLICY CREATED ---');
    console.log('Policy Name: Standard Policy (2026)');
    console.log('SL: 12, CL: 12, PL: 15');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createLeaveGroup();
