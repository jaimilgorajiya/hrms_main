const mongoose = require('mongoose');

async function masterSync() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const db = mongoose.connection.db;
    const email = 'jaimilgorajiya555@gmail.com';

    // 1. Find the ORIGINAL record with the photo
    const original = await db.collection('users').findOne({ 
      name: /Jaimil/i, 
      profilePhoto: { $exists: true, $ne: "" },
      email: { $ne: email } 
    });

    if (original) {
      console.log('Restoring account details from:', original.email);
      
      // 2. Delete the "empty" dummy admin
      await db.collection('users').deleteOne({ email: email });

      // 3. Transform the original record into the new Admin
      await db.collection('users').updateOne(
        { _id: original._id },
        { 
          $set: { 
            email: email, 
            role: 'Admin',
            status: 'Active'
          } 
        }
      );
      
      console.log('--- SUCCESS: ALL ORIGINAL DATA RESTORED TO ADMIN ---');
    } else {
      console.log('--- ERROR: Could not find any original record with photo ---');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

masterSync();
