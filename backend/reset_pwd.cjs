const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/ems';
const email = 'jaimilgorajiya555@gmail.com';
const newPass = 'admin123';

async function reset() {
  try {
    await mongoose.connect(MONGO_URI);
    const hashedPassword = await bcrypt.hash(newPass, 10);
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );
    
    if (result.matchedCount > 0) {
      console.log('--- PASSWORD RESET SUCCESS ---');
      console.log(`Email: ${email}`);
      console.log(`New Password: ${newPass}`);
    } else {
      console.log('--- USER NOT FOUND ---');
      console.log(`Could not find a user with email: ${email}`);
    }
  } catch (err) {
    console.error('--- RESET ERROR ---', err);
  } finally {
    process.exit(0);
  }
}

reset();
