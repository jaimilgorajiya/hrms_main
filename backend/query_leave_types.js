import dotenv from 'dotenv';
import mongoose from 'mongoose';
import './models/User.Model.js';
import './models/LeaveType.Model.js';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User');
    const LeaveType = mongoose.model('LeaveType');
    
    const jaimil = await User.findOne({ name: /Jaimil Gorajiya/i });
    console.log('Jaimil Admin ID:', jaimil?.adminId);
    
    const types = await LeaveType.find({ adminId: jaimil?.adminId });
    types.forEach(t => console.log(t.name, ':', t._id, 'applyOnPastDays:', t.applyOnPastDays, 'status:', t.status));
    
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
