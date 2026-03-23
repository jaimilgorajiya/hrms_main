import mongoose from 'mongoose';

const payrollSettingSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payslipFormat: {
        type: String,
        default: 'Format 1'
    },
    publishedSalarySlipDurationLimit: {
        type: String,
        default: '5 Days'
    },
    displayRoundOffAmount: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    advanceCarryForwardSalaryMonth: {
        type: Number,
        default: 12
    },
    maximumEmiMonths: {
        type: Number,
        default: 24
    },
    weekStartDay: {
        type: String,
        default: 'Monday'
    },
    defaultHraAmount: {
        type: Number,
        default: 0
    },
    form16ResponsibleUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    form16ResponsibleUserFatherName: {
        type: String,
        trim: true
    },
    form16ResponsibleUserDesignation: {
        type: String,
        trim: true
    },
    citTdsAddress: {
        type: String,
        trim: true
    },
    form16Signature: {
        type: String // File path
    },
    salaryStampSignature: {
        type: String // File path
    },
    fnfDeclaration: {
        type: String,
        default: 'Declaration By the Receiver\n\nI, the undersigned, hereby state that I have received the above-said amount as my full and final settlement out of my own free will and choice on tendering my resignation and I assure that I have no grievances, disputes, demands, and claims about my legal dues, back wages, reinstatement, or reemployment against the company.'
    }
}, { timestamps: true });

const PayrollSetting = mongoose.model('PayrollSetting', payrollSettingSchema);

export default PayrollSetting;
