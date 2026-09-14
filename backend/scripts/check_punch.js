import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';

async function main() {
    await connectDB();
    const u = await User.findOne({ email: 'employee.test@fidhost.com' });
    if (!u) {
        console.log('User not found');
        process.exit(1);
    }
    const a = await Attendance.findOne({ employee: u._id }).sort({ createdAt: -1 });
    console.log('--- ATTENDANCE PUNCHES ---');
    console.log(JSON.stringify(a?.punches, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
