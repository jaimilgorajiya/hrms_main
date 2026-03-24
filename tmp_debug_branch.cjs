const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    
    // Check User
    const user = await mongoose.connection.db.collection('users').findOne({ email: 'jaimilgorajiya324@gmail.com' });
    console.log('--- USER DATA ---');
    if (user) {
        console.log('Email:', user.email);
        console.log('Root branch field:', user.branch);
        console.log('WorkSetup location:', user.workSetup?.location);
    } else {
        console.log('User not found by email');
    }
    
    // Check Branches
    const branches = await mongoose.connection.db.collection('branches').find().toArray();
    console.log('\n--- BRANCHES DATA ---');
    branches.forEach(b => {
        console.log(`- Name: "${b.branchName}" | Coords: [${b.latitude}, ${b.longitude}] | Radius: ${b.radius}`);
    });
    
    process.exit();
}

check();
