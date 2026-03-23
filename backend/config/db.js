import mongoose from "mongoose";

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongoose connected");
    } catch (error) {
        console.log("Mongoose connection error", error);
        // process.exit(1); // Do not exit, just log for now
    }
}

export default connectDB;