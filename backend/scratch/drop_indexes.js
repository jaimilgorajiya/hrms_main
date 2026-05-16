import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dropOldIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({}));
        
        // List of global unique indexes that need to be dropped
        const indexesToDrop = ['email_1', 'phone_1', 'employeeId_1'];
        
        const existingIndexes = await User.collection.listIndexes().toArray();
        const indexNames = existingIndexes.map(idx => idx.name);
        
        for (const indexName of indexesToDrop) {
            if (indexNames.includes(indexName)) {
                console.log(`Dropping index: ${indexName}`);
                await User.collection.dropIndex(indexName);
                console.log(`Successfully dropped ${indexName}`);
            } else {
                console.log(`Index ${indexName} not found, skipping.`);
            }
        }

        console.log('Finished dropping old global indexes.');
        process.exit(0);
    } catch (error) {
        console.error('Error dropping indexes:', error);
        process.exit(1);
    }
};

dropOldIndexes();
