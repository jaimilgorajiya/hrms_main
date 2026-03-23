const mongoose = require('mongoose');

async function createLeaveTypes() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;

    const admin = await db.collection('users').findOne({ role: 'Admin' });
    if (!admin) {
      console.log('--- ERROR: Admin not found ---');
      process.exit(1);
    }

    const leaveTypes = [
      {
        name: "Sick Leave",
        shortName: "SL",
        attachmentRequired: "No",
        applyOnHoliday: "No",
        applicableFor: "All",
        description: "For medical reasons / health issues.",
        applyOnPastDays: "Yes",
        adminId: admin._id,
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Casual Leave",
        shortName: "CL",
        attachmentRequired: "No",
        applyOnHoliday: "No",
        applicableFor: "All",
        description: "For personal tasks / unplanned rest.",
        applyOnPastDays: "Yes",
        adminId: admin._id,
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Privilege Leave",
        shortName: "PL",
        attachmentRequired: "No",
        applyOnHoliday: "No",
        applicableFor: "All",
        description: "Paid earned leaves or annual leave.",
        applyOnPastDays: "No",
        adminId: admin._id,
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const lt of leaveTypes) {
      // Avoid duplicates
      const exists = await db.collection('leavetypes').findOne({ name: lt.name, adminId: admin._id });
      if (exists) {
        await db.collection('leavetypes').deleteOne({ _id: exists._id });
      }
      await db.collection('leavetypes').insertOne(lt);
    }

    console.log('--- SUCCESS: DUMMY LEAVE TYPES CREATED ---');
    console.log('1. Sick Leave (SL)');
    console.log('2. Casual Leave (CL)');
    console.log('3. Privilege Leave (PL)');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createLeaveTypes();
