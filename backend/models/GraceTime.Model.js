import mongoose from 'mongoose';

const graceTimeSlabSchema = new mongoose.Schema({
    extraWorkingMinutes: {
        type: Number,
        required: true,
        min: 0
    },
    graceMinutes: {
        type: Number,
        required: true,
        min: 0
    }
});

const graceTimeSchema = new mongoose.Schema({
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shift',
        required: true
    },
    shiftName: {
        type: String,
        required: true
    },
    slabs: [graceTimeSlabSchema],
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

const GraceTime = mongoose.model('GraceTime', graceTimeSchema);
export default GraceTime;
