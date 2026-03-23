import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
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
    branch: { type: String, required: true },
    department: { type: String, required: true },
    // Previous values (snapshot at time of promotion)
    previousDesignation: { type: String },
    previousDepartment: { type: String },
    // New values
    newDesignation: { type: String, required: true },
    promotionFrom: { type: Date, required: true },
    remark: { type: String },
    status: {
        type: String,
        enum: ['Active', 'Reverted'],
        default: 'Active'
    }
}, { timestamps: true });

export default mongoose.model('Promotion', promotionSchema);
