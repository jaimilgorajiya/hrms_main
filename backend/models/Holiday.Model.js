import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['National', 'Regional', 'Optional'],
        default: 'National'
    },
    applicableTo: {
        type: String,
        enum: ['All', 'Branch', 'Department'],
        default: 'All'
    },
    branches: {
        type: [String],
        default: []
    },
    departments: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    isPaid: {
        type: Boolean,
        default: true   // holidays are paid by default
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

holidaySchema.index({ adminId: 1, year: 1 });
holidaySchema.index({ adminId: 1, date: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
