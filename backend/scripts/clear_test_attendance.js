import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/User.Model.js';
import Attendance from '../models/Attendance.Model.js';

async function main() {
    await connectDB();
    const u = await User.findOne({ email: 'employee.test@fidhost.com' });
    if (u) {
        await Attendance.deleteMany({ employee: u._id });
        console.log('Cleared test attendance records.');
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
