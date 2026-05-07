import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({}, { strict: false });
const resignationSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);
const Resignation = mongoose.model('Resignation', resignationSchema);

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);

    const jaimil = await User.findOne({ employeeId: 'IFLORA-0004' });
    
    // Find their approved resignation
    const resignation = await Resignation.findOne({ 
        employeeId: jaimil._id, 
        status: 'Approved' 
    }).sort({ createdAt: -1 });

    console.log('Resignation:', JSON.stringify(resignation, null, 2));

    if (resignation?.lastWorkingDay) {
        await User.findByIdAndUpdate(jaimil._id, { exitDate: resignation.lastWorkingDay });
        console.log(`✅ Patched exitDate to: ${resignation.lastWorkingDay}`);
    } else {
        // Manually set to 11 April 2026 as shown in the UI
        const lwd = new Date('2026-04-11');
        await User.findByIdAndUpdate(jaimil._id, { exitDate: lwd });
        console.log(`✅ Manually set exitDate to: ${lwd}`);
    }

    process.exit(0);
}
fix().catch(e => { console.error(e); process.exit(1); });
