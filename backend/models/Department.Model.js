import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            required: true
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

// Indexes for performance and uniqueness
departmentSchema.index({ adminId: 1, branchId: 1, name: 1 }, { unique: true });
departmentSchema.index({ adminId: 1, branchId: 1, order: 1 });

const Department = mongoose.model("Department", departmentSchema);

export default Department;
