import mongoose from 'mongoose';

const salaryGroupSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: true,
        trim: true
    },
    payrollFrequency: {
        type: String,
        enum: ['Monthly Pay', 'Weekly Pay', 'Bi-Weekly Pay'],
        default: 'Monthly Pay'
    },
    workingDaysType: {
        type: String,
        enum: ['Calendar days (Paid Week Off & Holiday)', 'Fixed Working Days'],
        default: 'Calendar days (Paid Week Off & Holiday)'
    },
    salaryCycleStartDate: {
        type: Number,
        default: 1
    },
    roundedSalary: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

salaryGroupSchema.index({ adminId: 1, groupName: 1 }, { unique: true });

const SalaryGroup = mongoose.model('SalaryGroup', salaryGroupSchema);

export default SalaryGroup;
