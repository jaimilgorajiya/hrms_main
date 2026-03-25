import mongoose from 'mongoose';
import process from 'process';

const DB_URI = 'mongodb://localhost:27017/ems';

const checkAndFix = async () => {
    try {
        await mongoose.connect(DB_URI);
        
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        
        const admin = await User.findOne({ role: 'Admin' });
        if (!admin) {
            console.log('No Admin user found.');
            process.exit(0);
        }

        console.log(`Main Admin Found: ${admin.name} (${admin._id})`);

        const employees = await User.find({ role: { $ne: 'Admin' } });
        console.log(`\nTotal Non-Admin Users: ${employees.length}`);

        const withoutAdminId = employees.filter(e => !e.adminId);
        console.log(`Users without adminId: ${withoutAdminId.length}`);
        withoutAdminId.forEach(e => {
            console.log(`- ${e.name} (Role: ${e.role}, Branch: ${e.branch})`);
        });

        const withWrongAdminId = employees.filter(e => e.adminId && e.adminId.toString() !== admin._id.toString());
        console.log(`\nUsers with different adminId: ${withWrongAdminId.length}`);
        withWrongAdminId.forEach(e => {
            console.log(`- ${e.name} has adminId: ${e.adminId}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAndFix();
