import mongoose from 'mongoose';
import process from 'process';

const DB_URI = 'mongodb://localhost:27017/ems';

const checkDB = async () => {
    try {
        await mongoose.connect(DB_URI);
        
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));

        const employees = await User.find({ role: { $ne: 'Admin' } });
        console.log(`\n--- Employees (${employees.length}) ---`);
        employees.forEach(e => {
            console.log(`Name: ${e.name}, Role: ${e.role}, Branch: ${e.branch}, adminId: ${e.adminId}`);
        });

        const branches = await Branch.find({});
        console.log(`\n--- Branches (${branches.length}) ---`);
        branches.forEach(b => {
             console.log(`Name: ${b.branchName}, ShortName: ${b.branchShortName}, _id: ${b._id}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDB();
