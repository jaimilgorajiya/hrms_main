const mongoose = require('mongoose');

async function syncDetails() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;
    
    // Find the record WITH details (original)
    const original = await db.collection('users').findOne({ 
      name: /Jaimil/i, 
      profilePhoto: { $exists: true, $ne: "" },
      email: { $ne: 'jaimilgorajiya555@gmail.com' }
    });
    
    // Find our new Admin account (target)
    const admin = await db.collection('users').findOne({ email: 'jaimilgorajiya555@gmail.com' });
    
    if (original && admin) {
      console.log('Restoring from:', original.email);
      await db.collection('users').updateOne(
        { _id: admin._id },
        { 
          $set: { 
            profilePhoto: original.profilePhoto,
            currentAddress: original.currentAddress,
            permanentAddress: original.permanentAddress,
            dateOfBirth: original.dateOfBirth,
            phone: original.phone,
            gender: original.gender,
            firstName: original.firstName,
            lastName: original.lastName
          } 
        }
      );
      console.log('--- SUCCESS: ALL DETAILS RESTORED ---');
    } else {
      console.log('--- ERROR: Could not find original record details ---');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncDetails();
