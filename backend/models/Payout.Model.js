import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: String, // YYYY-MM
        required: true
    },
    baseSalary: {
        type: Number,
        required: true
    },
    attendance: {
        present: Number,
        halfDay: Number,
        absent: Number,
        weekOff: Number,
        holiday: Number,
        paidLeave: Number,
        unpaidLeave: Number
    },
    systemAccrued: {
        type: Number,
        required: true
    },
    penalties: {
        total: Number,
        lateIn: Number,
        earlyOut: Number
    },
    adjustments: {
        bonus: {
            amount: { type: Number, default: 0 },
            reason: String
        },
        deduction: {
            amount: { type: Number, default: 0 },
            reason: String
        }
    },
    finalPayout: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Initiated', 'Generated', 'Published', 'Cancelled'],
        default: 'Initiated'
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    initiatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure one payout per month per employee
payoutSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const Payout = mongoose.model('Payout', payoutSchema);

export default Payout;
