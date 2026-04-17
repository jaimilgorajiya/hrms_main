import mongoose from "mongoose";

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected`);
// Silent connection success
    } catch (error) {
        console.log("Mongoose connection error", error);
        // process.exit(1); // Do not exit, just log for now
    }
}

export default connectDB;