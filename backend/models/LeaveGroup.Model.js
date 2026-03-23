import mongoose from 'mongoose';

const leaveGroupSchema = new mongoose.Schema({
    leaveGroupName: {
        type: String,
        required: true,
        trim: true
    },
    leaveBalanceVisibility: {
        type: String,
        enum: ['Default (Multiple of 0.5)', 'Multiple of 1', 'Multiple of 0.25'],
        default: 'Default (Multiple of 0.5)'
    },
    leaveIntimationEmails: {
        type: [String],
        default: []
    },
    generatePenaltyOnLeaveRequestPending: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    isPaidLeave: {
        type: Boolean,
        default: false
    },
    // Paid Leave fields (visible when isPaidLeave is true)
    leaveAllocationType: {
        type: String,
        enum: ['Yearly', 'Monthly', 'Quarterly', 'Half Yearly'],
        default: 'Yearly'
    },
    noOfPaidLeaves: {
        type: Number,
        default: 0
    },
    leaveAppliedFormula: {
        type: String,
        enum: ['Multiple of 0.5', 'Multiple of 1', 'Multiple of 0.25'],
        default: 'Multiple of 0.5'
    },
    maxUseInMonth: {
        type: Number,
        default: null
    },
    leaveFrequency: {
        type: String,
        enum: ['Annually', 'Monthly', 'Quarterly'],
        default: 'Annually'
    },
    leaveCalculation: {
        type: String,
        enum: ['Manual Calculation', 'Auto Calculation'],
        default: 'Manual Calculation'
    },
    leaveRestrictions: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    leaveAccordingToPayrollCycle: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    takeLeaveDuringProbationPeriod: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    takeLeaveDuringNoticePeriod: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    addPaidLeaveBasedOnAttendance: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    restrictUnpaidLeaveToEmployeesMonthly: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    maxUnpaidLeaveInMonth: {
        type: Number,
        default: null
    },
    remark: {
        type: String,
        trim: true,
        default: ''
    },
    yearEndLeaveBalancePolicy: {
        type: String,
        enum: ['Payout all (Manually)', 'Payout or Carry forward (Manually)', 'Reset to zero', 'Carry forward all (Manually)'],
        default: 'Payout all (Manually)'
    },
    maxCarryForward: {
        type: Number,
        default: null
    },
    minCarryForward: {
        type: Number,
        default: null
    },
    carryForwardIncludes: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'Yes'
    },
    allowLeavePayoutRequest: {
        type: String,
        enum: ['No', 'Yes'],
        default: 'No'
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true });

leaveGroupSchema.index({ adminId: 1, leaveGroupName: 1 });

export default mongoose.model('LeaveGroup', leaveGroupSchema);
