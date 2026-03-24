import mongoose from 'mongoose';
import User from './models/User.Model.js';

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/ems');
    
    // Delete the Employee account (IFLORA-0002)
    const res = await User.deleteOne({ employeeId: 'IFLORA-0002' });
    console.log('Result of deletion:', res);
    
    // Ensure the Admin account (HELLO-2026-000002) is set correctly
    const admin = await User.findOne({ employeeId: 'HELLO-2026-000002' });
    console.log('Final Admin status:', admin?.email, admin?.role);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
