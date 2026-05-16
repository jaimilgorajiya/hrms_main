import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkClient = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Client = mongoose.model('Client', new mongoose.Schema({}, { strict: false }));
        const clients = await Client.find({});
        console.log('Clients:', JSON.stringify(clients, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
checkClient();
