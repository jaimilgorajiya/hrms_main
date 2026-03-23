import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pincode: { 
            type: String
        },
        addedBy: {
            type: String, // We'll store user name/email here
        },
        coordinates: {
            latitude: { type: Number }, // e.g., 28.6139
            longitude: { type: Number }, // e.g., 77.2090
            radius: { type: Number, default: 100 } // Allowed radius in meters
        }
    },
    {
        timestamps: true
    }
);

const Location = mongoose.model("Location", locationSchema);

export default Location;