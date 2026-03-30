import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    requestType: {
        type: String,
        enum: ["Leave", "Attendance Correction"],
        required: true
    },
    leaveType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveType"
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    // For Attendance Correction
    manualIn: { type: Date },
    manualOut: { type: Date },
    // Status
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    actionDate: {
        type: Date
    },
    adminRemark: {
        type: String
    }
}, { timestamps: true });

const Request = mongoose.model("Request", requestSchema);
export default Request;
