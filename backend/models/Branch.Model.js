import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
    {
        branchName: {
            type: String,
            required: true
        },
        branchCode: {
            type: String
        },
        branchType: {
            type: String,
            required: true,
            enum: ["Metro city", "Non-Metro city"]
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        order: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// Unique branch name per admin
branchSchema.index({ adminId: 1, branchName: 1 }, { unique: true });

const Branch = mongoose.model("Branch", branchSchema);

export default Branch;
