import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        duration: {
            value: {
                type: Number,
                required: true
            },
            unit: {
                type: String,
                enum: ['day', 'month', 'year'],
                required: true
            }
        },
        maxEmployees: {
            type: Number,
            default: 10
        },
        packageType: {
            type: String,
            enum: ['subscription', 'employee_addon'],
            default: 'subscription'
        },
        addonEmployees: {
            type: Number,
            default: 0
            // For employee_addon: no longer the fixed quantity. 
            // 'price' is the per-employee cost. Clients choose their own quantity.
        },
        services: [{
            type: String
        }],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Package = mongoose.model("Package", packageSchema);

export default Package;
