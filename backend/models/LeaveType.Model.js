import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    shortName: {
        type: String,
        trim: true
    },
    attachmentRequired: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    applyOnHoliday: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    applicableFor: {
        type: String,
        enum: ['All', 'Male Only', 'Female Only', 'Married', 'Un-Married', 'Married Female Only', 'Married Male Only'],
        default: 'All'
    },
    isBirthdayAnniversary: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        trim: true
    },
    applyOnPastDays: {
        type: String,
        enum: ['Yes', 'No'],
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

// Index for performance and scope
leaveTypeSchema.index({ adminId: 1, name: 1 });

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);
export default LeaveType;
