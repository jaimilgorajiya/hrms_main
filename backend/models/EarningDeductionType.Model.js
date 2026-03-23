import mongoose from "mongoose";

const earningDeductionTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            required: true,
            enum: ['Earnings', 'Deductions']
        },
        allowanceType: {
            type: String,
            enum: ['None', 'Bonus Allowance', 'Special Allowance', 'Transport Allowance', 'Other'],
            default: 'None'
        },
        description: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            required: true,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Unique name per type per admin
earningDeductionTypeSchema.index({ adminId: 1, type: 1, name: 1 }, { unique: true });

const EarningDeductionType = mongoose.model("EarningDeductionType", earningDeductionTypeSchema);

export default EarningDeductionType;
