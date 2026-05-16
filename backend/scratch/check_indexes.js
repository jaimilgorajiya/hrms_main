import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model('User', new mongoose.Schema({}));
        const indexes = await User.collection.listIndexes().toArray();
        console.log('Current Indexes:', JSON.stringify(indexes, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
checkIndexes();
