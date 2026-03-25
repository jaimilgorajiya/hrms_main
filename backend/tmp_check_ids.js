import mongoose from 'mongoose';
import process from 'process';

const DB_URI = 'mongodb://localhost:27017/ems';

const checkDB = async () => {
    try {
        await mongoose.connect(DB_URI);
        
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        
        const admins = await User.find({ role: 'Admin' });
        console.log(`\n--- Admins (${admins.length}) ---`);
        admins.forEach(a => {
            console.log(`- Name: ${a.name}, _id: ${a._id}`);
        });

        const usersWithoutAdminId = await User.find({ role: { $ne: 'Admin' }, adminId: { $exists: false } });
        console.log(`\n--- Users without adminId (${usersWithoutAdminId.length}) ---`);
        usersWithoutAdminId.forEach(u => {
            console.log(`- Name: ${u.name}, Branch: ${u.branch}, Role: ${u.role}`);
        });

        const usersWithAdminId = await User.find({ role: { $ne: 'Admin' }, adminId: { $exists: true } });
        console.log(`\n--- Users with adminId (${usersWithAdminId.length}) ---`);
        usersWithAdminId.forEach(u => {
            console.log(`- Name: ${u.name}, Branch: ${u.branch}, adminId: ${u.adminId}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDB();
