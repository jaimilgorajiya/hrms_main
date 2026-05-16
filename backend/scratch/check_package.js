import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkPackage = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Package = mongoose.model('Package', new mongoose.Schema({}, { strict: false }));
        const pkg = await Package.findById("6a070b87476e02cd56125278");
        console.log('Package:', JSON.stringify(pkg, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
checkPackage();
