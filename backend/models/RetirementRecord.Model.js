import mongoose from 'mongoose';

const retirementRecordSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    retirementAge: { type: Number, required: true },
    retirementDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Upcoming', 'Notified', 'In Process', 'Completed', 'Extended'],
        default: 'Upcoming'
    },
    // Extension info
    extensionMonths: { type: Number, default: 0 },
    extensionReason: { type: String },
    originalRetirementDate: { type: Date },
    // Notifications sent: [{ days: 90, sentAt: Date }]
    notificationsSent: [{
        days: Number,
        sentAt: Date
    }],
    exitInitiatedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String }
}, { timestamps: true });

// One record per employee per admin
retirementRecordSchema.index({ adminId: 1, employeeId: 1 }, { unique: true });

export default mongoose.model('RetirementRecord', retirementRecordSchema);
