import mongoose from "mongoose";

const breakTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    minutes: {
        type: String, // Storing as string to handle "As Per Shift" or numeric values
        default: "As Per Shift"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    order: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Compound index for uniqueness per admin
breakTypeSchema.index({ adminId: 1, name: 1 }, { unique: true });

const BreakType = mongoose.model("BreakType", breakTypeSchema);

export default BreakType;