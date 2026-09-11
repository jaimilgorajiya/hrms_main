import 'dotenv/config';
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.Model.js';
import Request from '../models/Request.Model.js';

async function cleanupExistingManualEntryPlaceholders() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB. Starting cleanup...");

        // 1. Clean top-level workSummary in Attendance
        const attSummaryResult = await Attendance.updateMany(
            { workSummary: "Manual entry by admin" },
            { $set: { workSummary: "" } }
        );
        console.log(`Updated Attendance top-level workSummary: ${attSummaryResult.modifiedCount} records cleaned.`);

        // 2. Clean top-level remark in Attendance
        const attRemarkResult = await Attendance.updateMany(
            { remark: "Manual entry by admin" },
            { $set: { remark: "" } }
        );
        console.log(`Updated Attendance top-level remark: ${attRemarkResult.modifiedCount} records cleaned.`);

        // 3. Clean punches array workSummary in Attendance
        const attPunchesResult = await Attendance.updateMany(
            { "punches.workSummary": "Manual entry by admin" },
            { $set: { "punches.$[elem].workSummary": "" } },
            { arrayFilters: [{ "elem.workSummary": "Manual entry by admin" }] }
        );
        console.log(`Updated Attendance punches workSummary: ${attPunchesResult.modifiedCount} records cleaned.`);

        // 4. Clean workSummary in Request
        const reqSummaryResult = await Request.updateMany(
            { workSummary: "Manual entry by admin" },
            { $set: { workSummary: "" } }
        );
        console.log(`Updated Request workSummary: ${reqSummaryResult.modifiedCount} records cleaned.`);

        console.log("✅ Cleanup completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
}

cleanupExistingManualEntryPlaceholders();
