import mongoose from "mongoose";

const exitRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    exitDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending Clearance', 'Cleared', 'Settled'],
        default: 'Pending Clearance'
    },
    departmentClearance: {
        it: { type: Boolean, default: false },
        hr: { type: Boolean, default: false },
        finance: { type: Boolean, default: false },
        admin: { type: Boolean, default: false },
        manager: { type: Boolean, default: false }
    },
    comments: { type: String },
    fullAndFinal: {
        settlementAmount: { type: Number, default: 0 },
        paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
        paymentDate: { type: Date }
    },
    documentsIssued: {
        experienceLetter: { type: Boolean, default: false },
        relievingLetter: { type: Boolean, default: false }
    }
}, { timestamps: true });

export default mongoose.model("ExitRecord", exitRecordSchema);
