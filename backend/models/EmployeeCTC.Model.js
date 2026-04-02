import mongoose from 'mongoose';

const employeeCTCSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // The total Cost to Company (Annual)
    annualCTC: {
        type: Number,
        required: true,
        default: 0
    },
    monthlyGross: {
        type: Number,
        required: true,
        default: 0
    },
    // Structured breakdown of earnings
    earnings: [{
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningDeductionType' },
        componentName: { type: String, required: true }, // Snapshotted name
        amount: { type: Number, required: true },
        isTaxable: { type: Boolean, default: true },
        category: { type: String, default: 'Fixed' }
    }],
    // Structured breakdown of deductions
    deductions: [{
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningDeductionType' },
        componentName: { type: String, required: true }, // Snapshotted name
        amount: { type: Number, required: true }
    }],
    netSalary: {
        type: Number,
        required: true,
        default: 0
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Revised'],
        default: 'Active'
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const EmployeeCTC = mongoose.model('EmployeeCTC', employeeCTCSchema);

export default EmployeeCTC;
