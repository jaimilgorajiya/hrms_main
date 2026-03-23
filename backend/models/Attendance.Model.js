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
        type: { type: String, enum: ["IN", "OUT"], required: true }
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
    }
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
