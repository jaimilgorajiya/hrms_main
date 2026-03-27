import mongoose from 'mongoose';

const penaltySlabSchema = new mongoose.Schema({
    penaltyType: { 
        type: String, 
        enum: ['Late In Minutes', 'Half-Day'], 
        default: 'Late In Minutes' 
    },
    minTime: { 
        type: Number
    },
    maxTime: { 
        type: Number
    },
    type: { 
        type: String, 
        enum: ['Flat', 'Percentage', 'Per Minute (Flat Amount)', 'Per Minute (As Per Salary)', 'Half Day Salary', 'Full Day Salary'], 
        default: 'Flat' 
    },
    value: { 
        type: Number
    },
    grace_count: {
        type: Number,
        default: 0,
        min: 0
    },
    threshold_time: {
        type: String  // HH:mm, used for Half-Day type
    }
}, { _id: true });

const penaltyRuleSchema = new mongoose.Schema({
    shift: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shift', 
        required: true,
        unique: true // One set of rules per shift
    },
    slabs: [penaltySlabSchema],
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

// Redundant index removed: shift field already has unique: true in Schema definition

const PenaltyRule = mongoose.model('PenaltyRule', penaltyRuleSchema);

export default PenaltyRule;