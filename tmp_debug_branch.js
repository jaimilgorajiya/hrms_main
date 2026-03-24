import mongoose from 'mongoose';
import User from './backend/models/User.Model.js';
import Branch from './backend/models/Branch.Model.js';

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    
    const user = await User.findOne({ email: 'jaimilgorajiya324@gmail.com' });
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
        console.log('User branch:', user.branch);
        console.log('User workSetup.location:', user.workSetup?.location);
    }
    
    const branches = await Branch.find();
    console.log('All Branches in DB:');
    branches.forEach(b => {
        console.log(`- ${b.branchName}: [${b.latitude}, ${b.longitude}], radius: ${b.radius}`);
    });
    
    process.exit();
}

check();
