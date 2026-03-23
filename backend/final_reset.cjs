const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function reset() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ems');
  const pass = await bcrypt.hash('admin123', 10);
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'jaimilgorajiya555@gmail.com' },
    { $set: { password: pass } }
  );
  console.log('--- ADMIN PASSWORD RESET: admin123 ---');
  process.exit(0);
}

reset();
