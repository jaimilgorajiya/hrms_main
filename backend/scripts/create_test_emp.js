import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.Model.js';
import connectDB from '../config/db.js';

async function main() {
    await connectDB();
    console.log('Database connected.');

    const adminEmail = 'coban89859@fidhost.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
        console.log(`Admin ${adminEmail} not found. Searching for any Admin user...`);
        admin = await User.findOne({ role: 'Admin' });
    }

    if (!admin) {
        console.error('No admin account found in database.');
        process.exit(1);
    }

    console.log(`Found Admin: ${admin.name} (${admin.email}) ID: ${admin._id}`);

    const empEmail = 'employee.test@fidhost.com';
    const empPhone = '9876543210';
    const plainPassword = 'Password@123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    let emp = await User.findOne({ $or: [{ email: empEmail }, { phone: empPhone }] });

    const Shift = (await import('../models/Shift.Model.js')).default;
    let shift = await Shift.findOne({ adminId: admin._id });
    if (!shift) {
        shift = await Shift.create({
            adminId: admin._id,
            shiftName: 'General Shift',
            shiftCode: 'GS',
            startTime: '09:00',
            endTime: '18:00',
            schedule: {
                Monday: { isWorkDay: true, shiftStart: '09:00', shiftEnd: '18:00' },
                Tuesday: { isWorkDay: true, shiftStart: '09:00', shiftEnd: '18:00' },
                Wednesday: { isWorkDay: true, shiftStart: '09:00', shiftEnd: '18:00' },
                Thursday: { isWorkDay: true, shiftStart: '09:00', shiftEnd: '18:00' },
                Friday: { isWorkDay: true, shiftStart: '09:00', shiftEnd: '18:00' },
                Saturday: { isWorkDay: true, shiftStart: '09:00', shiftEnd: '18:00' },
                Sunday: { isWorkDay: false }
            }
        });
        console.log(`Created General Shift for Admin: ${shift.shiftName}`);
    }

    if (emp) {
        emp.email = empEmail;
        emp.phone = empPhone;
        emp.password = hashedPassword;
        emp.adminId = admin._id;
        emp.shift = shift._id;
        emp.role = 'Employee';
        emp.status = 'Active';
        await emp.save();
        console.log(`Updated existing employee: ${emp.name}`);
    } else {
        emp = await User.create({
            name: 'Test Employee',
            firstName: 'Test',
            lastName: 'Employee',
            email: empEmail,
            phone: empPhone,
            password: hashedPassword,
            role: 'Employee',
            status: 'Active',
            adminId: admin._id,
            employeeId: 'EMP-9999'
        });
        console.log(`Created new employee: ${emp.name}`);
    }

    console.log('-------------------------------------------');
    console.log('Employee Account Created/Updated Successfully!');
    console.log(`Email / Login: ${empEmail}`);
    console.log(`Phone: ${empPhone}`);
    console.log(`Password: ${plainPassword}`);
    console.log(`Admin Linked: ${admin.name} (${admin.email})`);
    console.log('-------------------------------------------');

    process.exit(0);
}

main().catch(err => {
    console.error('Error creating test employee:', err);
    process.exit(1);
});
