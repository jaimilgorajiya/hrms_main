import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const employeeCTCSchema = new mongoose.Schema({
    employeeId: mongoose.Schema.Types.ObjectId,
    monthlyGross: Number,
    netSalary: Number,
    earnings: Array,
    status: String
});
const EmployeeCTC = mongoose.model('EmployeeCTC', employeeCTCSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hrms');
        const ctc = await EmployeeCTC.findOne({ employeeId: '69c262b4f829564ffdaf86bf' });
        console.log("CTC for User:", JSON.stringify(ctc, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
