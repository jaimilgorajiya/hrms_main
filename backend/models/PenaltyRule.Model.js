import mongoose from 'mongoose';

const penaltySlabSchema = new mongoose.Schema({
    penaltyType: { 
        type: String, 
        enum: ['Auto Leave', 'Late In Minutes', 'Break Penalty'], 
        default: 'Auto Leave' 
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
        type: Number, 
        required: true 
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