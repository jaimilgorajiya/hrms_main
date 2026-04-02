import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.Model.js';
import EmployeeCTC from './models/EmployeeCTC.Model.js';
import SalaryGroup from './models/SalaryGroup.Model.js';
import Attendance from './models/Attendance.Model.js';

async function jaimilStats() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ employeeId: 'IFLORA-0004' }).populate('workSetup.salaryGroup');
    const ctc = await EmployeeCTC.findOne({ employeeId: user._id, status: 'Active' });
    const salaryGroup = user.workSetup?.salaryGroup;

    const start = "2026-03-01";
    const end = "2026-03-31";
    const attendance = await Attendance.find({ employee: user._id, date: { $gte: start, $lte: end } });

    console.log("March Attendance Count:", attendance.length);
    console.log("Present:", attendance.filter(a => a.status === 'Present').length);
    console.log("Week Off:", attendance.filter(a => a.status === 'Week Off').length);
    console.log("Holiday:", attendance.filter(a => a.status === 'Holiday').length);
    console.log("Absent (Explicit):", attendance.filter(a => a.status === 'Absent').length);
    
    // Total calendar days in March = 31
    const recordedDates = attendance.map(a => a.date);
    let missingDays = 0;
    for(let d=1; d<=31; d++) {
        let dateStr = `2026-03-${d.toString().padStart(2, '0')}`;
        if(!recordedDates.includes(dateStr)) missingDays++;
    }
    console.log("Missing (System Absent):", missingDays);

    process.exit(0);
}
jaimilStats();
