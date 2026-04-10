import mongoose from 'mongoose';
import 'dotenv/config';
import Payout from './models/Payout.Model.js';
import connectDB from './config/db.js';

const migrate = async () => {
    await connectDB();
    console.log("Migrating payouts...");
    
    const result = await Payout.updateMany(
        { status: 'Pending' },
        { $set: { status: 'Initiated' } }
    );
    
    console.log(`Updated ${result.modifiedCount} records from 'Pending' to 'Initiated'.`);
    process.exit(0);
};

migrate();
