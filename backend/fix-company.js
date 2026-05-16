import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from './models/Company.Model.js';

const fixCompany = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB successfully.');
        
        // The adminId from the user's screenshot
        const adminIdToFind = '69bcd49924bc9d63622bdf76';
        
        console.log(`Looking for Company with adminId: ${adminIdToFind}`);
        const company = await Company.findOne({ adminId: adminIdToFind });
        
        if (company) {
            console.log('Found Company:', company.companyName);
            
            company.isActive = true;
            company.paymentStatus = 'completed';
            
            // Ensure packageExpiryDate is set in the future so login is not blocked
            if (!company.packageExpiryDate) {
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year from now
                company.packageExpiryDate = expiryDate;
                company.packageStartDate = new Date();
            }
            
            await company.save();
            console.log('✅ SUCCESS: Company document has been activated and payment marked as completed!');
        } else {
            console.log('❌ ERROR: No company found with that adminId. Did you register via the signup form?');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB.');
    }
};

fixCompany();
