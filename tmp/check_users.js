import mongoose from 'mongoose';
import User from '../backend/models/User.Model.js';

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    const users = await User.find({ name: 'Jaimil Gorajiya' }).select('name email role employeeId');
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
