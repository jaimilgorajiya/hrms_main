import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./backend/models/User.Model.js";

dotenv.config({ path: "./backend/.env" });

async function resetPassword() {
    const email = "jaimilgorajiya555@gmail.com";
    const newPassword = "admin123"; // You can use this to login

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User with email "${email}" not found.`);
        } else {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
            console.log(`Successfully reset password for "${email}" to "${newPassword}"`);
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error resetting password:", error);
    }
}

resetPassword();
