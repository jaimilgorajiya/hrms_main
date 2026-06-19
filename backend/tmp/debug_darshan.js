import mongoose from 'mongoose';
import 'dotenv/config';

async function run() {
    const atlasURI = 'mongodb+srv://ifloriana2025_db_user:aVzggLNwT4CfYtO5@employeecrm.fotdz28.mongodb.net/?appName=employeeCrm';
    await mongoose.connect(atlasURI);
    console.log("Connected to DB");
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

    const adminId = new mongoose.Types.ObjectId('69df8478c27252632ff78098');

    const adminFilter = {
        role: { $ne: 'Admin' },
        adminId,
        status: { $nin: ['Ex-Employee', 'Resigned', 'Terminated', 'Absconding', 'Retired'] }
    };

    const totalUsers = await User.countDocuments(adminFilter);
    const activeEmployees = await User.find({ ...adminFilter, status: 'Active' }).select('_id');
    const activeEmpIds = activeEmployees.map(e => e._id);
    const activeUsersCount = activeEmpIds.length;

    const todayStr = '2026-06-19';
    const presentToday = await Attendance.countDocuments({ adminId, date: todayStr, status: { $in: ['Present', 'Clocked In'] }, employee: { $in: activeEmpIds } });
    const halfDayToday = await Attendance.countDocuments({ adminId, date: todayStr, status: { $in: ['Half Day', 'HALF DAY'] }, employee: { $in: activeEmpIds } });
    const onLeaveToday = await Attendance.countDocuments({ adminId, date: todayStr, status: 'On Leave', employee: { $in: activeEmpIds } });
    const totalAttendanceToday = await Attendance.countDocuments({ adminId, date: todayStr, employee: { $in: activeEmpIds } });
    const absentToday = Math.max(0, activeUsersCount - totalAttendanceToday);

    console.log("=== Stats ===");
    console.log("Total Users (Workforce):", totalUsers);
    console.log("Active Employees:", activeUsersCount);
    console.log("Present Today:", presentToday);
    console.log("Half Day Today:", halfDayToday);
    console.log("On Leave Today:", onLeaveToday);
    console.log("Absent Today:", absentToday);
    console.log("Total Attendance Recorded Today:", totalAttendanceToday);

    await mongoose.disconnect();
}

run().catch(console.error);
