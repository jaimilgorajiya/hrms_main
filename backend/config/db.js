import mongoose from "mongoose";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";

const cleanupManualEntryPlaceholders = async () => {
    try {
        await Attendance.updateMany({ workSummary: "Manual entry by admin" }, { $set: { workSummary: "" } });
        await Attendance.updateMany({ remark: "Manual entry by admin" }, { $set: { remark: "" } });
        await Attendance.updateMany(
            { "punches.workSummary": "Manual entry by admin" },
            { $set: { "punches.$[elem].workSummary": "" } },
            { arrayFilters: [{ "elem.workSummary": "Manual entry by admin" }] }
        );
        await Request.updateMany({ workSummary: "Manual entry by admin" }, { $set: { workSummary: "" } });
    } catch (err) {
        console.error("Cleanup manual entry placeholder error:", err.message);
    }
};

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected`);
        cleanupManualEntryPlaceholders();
    } catch (error) {
        console.log("Mongoose connection error", error);
    }
}

export default connectDB;