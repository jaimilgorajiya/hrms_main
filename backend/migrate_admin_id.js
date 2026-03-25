import mongoose from 'mongoose';
import process from 'process';

const DB_URI = 'mongodb://localhost:27017/ems';

const migrateAdminId = async () => {
    try {
        await mongoose.connect(DB_URI);
        
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        
        // Find the primary admin (Jaimil Gorajiya)
        const admin = await User.findOne({ role: 'Admin' });
        if (!admin) {
            console.log('No Admin user found to associate with employees.');
            process.exit(1);
        }

        console.log(`Found Admin: ${admin.name} (${admin._id})`);

        // Find all non-admin users without an adminId
        const result = await User.updateMany(
            { 
                role: { $ne: 'Admin' }, 
                $or: [
                    { adminId: { $exists: false } },
                    { adminId: null }
                ]
            },
            { $set: { adminId: admin._id } }
        );

        console.log(`Successfully updated ${result.modifiedCount} employees with adminId: ${admin._id}`);
        
        // Final check
        const totalOrphans = await User.countDocuments({ role: { $ne: 'Admin' }, adminId: { $exists: false } });
        console.log(`Remaining orphaned employees: ${totalOrphans}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateAdminId();
