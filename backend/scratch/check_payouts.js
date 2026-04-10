import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const payoutSchema = new mongoose.Schema({
    employeeId: mongoose.Schema.Types.ObjectId,
    month: String,
    baseSalary: Number,
    systemAccrued: Number,
    finalPayout: Number,
    status: String
});
const Payout = mongoose.model('Payout', payoutSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hrms');
        const lastPayouts = await Payout.find().sort({ createdAt: -1 }).limit(5);
        console.log("Last 5 Payouts:", JSON.stringify(lastPayouts, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
