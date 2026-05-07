import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    punches: [{
        time: { type: Date, required: true },
        type: { type: String, enum: ["IN", "OUT"], required: true },
        latitude: Number,
        longitude: Number,
        geofenceReason: String,
        workSummary: String,
        earlyReason: String,
        lateReason: String,
        locationAddress: String
    }],
    breaks: [{
        start: { type: Date },
        end: { type: Date },
        type: { type: String, default: "General" }
    }],
    status: {
        type: String,
        enum: ["Present", "Absent", "Half Day", "On Leave"],
        default: "Present"
    },
    lateInPenalty: {
        amount: { type: Number, default: 0 },
        isApplied: { type: Boolean, default: false },
        isLate: { type: Boolean, default: false }
    },
    approvalStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    }
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 }); // Optimize admin queries filtering by date

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
