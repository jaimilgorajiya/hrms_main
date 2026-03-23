const mongoose = require('mongoose');

async function createShift() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;

    const admin = await db.collection('users').findOne({ email: 'jaimilgorajiya555@gmail.com' });
    
    const weekdaySchedule = {
      shiftStart: "09:30",
      shiftEnd: "18:30",
      lunchStart: "13:00",
      lunchEnd: "14:00",
      minFullDayHours: 8
    };

    const saturdaySchedule = {
      shiftStart: "09:30",
      shiftEnd: "16:00",
      lunchStart: "13:00",
      lunchEnd: "14:00",
      minFullDayHours: 5.5
    };

    const newShift = {
      shiftName: "Standard Day Shift (Mon-Sat)",
      shiftCode: "STD01",
      hoursType: "Full Shift Hours",
      weekOffType: "Selected Weekdays",
      weekOffDays: ["Sunday"],
      schedule: {
        monday: weekdaySchedule,
        tuesday: weekdaySchedule,
        wednesday: weekdaySchedule,
        thursday: weekdaySchedule,
        friday: weekdaySchedule,
        saturday: saturdaySchedule,
        sunday: { shiftStart: "", shiftEnd: "" }
      },
      isActive: true,
      createdBy: admin ? admin._id : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if it already exists to avoid duplicates
    const existing = await db.collection('shifts').findOne({ shiftName: newShift.shiftName });
    if (existing) {
      await db.collection('shifts').deleteOne({ _id: existing._id });
    }

    await db.collection('shifts').insertOne(newShift);
    console.log('--- SUCCESS: REALISTIC SHIFT CREATED ---');
    console.log('Shift Name: Standard Day Shift (Mon-Sat)');
    console.log('Mon-Fri: 09:30 - 18:30');
    console.log('Saturday: 09:30 - 16:00');
    console.log('Break: 13:00 - 14:00 (All 6 Days)');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createShift();
