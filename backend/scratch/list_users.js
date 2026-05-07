import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.Model.js";

dotenv.config();

async function listUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}, "email name role password");
        console.log("Users in Database:");
        console.log(JSON.stringify(users, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

listUsers();
