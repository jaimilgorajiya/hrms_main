import mongoose from 'mongoose';
import 'dotenv/config';
import Attendance from './models/Attendance.Model.js';
import User from './models/User.Model.js';

const syncAttendanceAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const records = await Attendance.find({ adminId: { $exists: false } });
        console.log(`Found ${records.length} attendance records missing adminId.`);

        let updatedCount = 0;
        for (const record of records) {
            const employee = await User.findById(record.employee).select('adminId');
            if (employee && employee.adminId) {
                record.adminId = employee.adminId;
                await record.save();
                updatedCount++;
            } else if (employee) {
                // If the user itself is an admin (rare case for attendance)
                record.adminId = employee._id;
                await record.save();
                updatedCount++;
            }
        }

        console.log(`Successfully synced ${updatedCount} attendance records.`);
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
};

syncAttendanceAdmin();
