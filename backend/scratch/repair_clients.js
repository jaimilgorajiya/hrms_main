import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const repairClients = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const Package = mongoose.model('Package', new mongoose.Schema({ maxEmployees: Number }, { strict: false }));
        const Client = mongoose.model('Client', new mongoose.Schema({ 
            adminId: mongoose.Schema.Types.ObjectId,
            packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
            maxEmployees: Number,
            addonPurchases: [{ employeesAdded: Number }]
        }, { strict: false }));

        const clients = await Client.find({}).populate('packageId');
        
        for (const client of clients) {
            if (!client.packageId) continue;
            
            const baseLimit = client.packageId.maxEmployees || 0;
            const addonTotal = (client.addonPurchases || []).reduce((sum, a) => sum + (a.employeesAdded || 0), 0);
            const expectedTotal = baseLimit + addonTotal;
            
            if (client.maxEmployees !== expectedTotal) {
                console.log(`Repairing Client ${client._id}: ${client.maxEmployees} -> ${expectedTotal}`);
                client.maxEmployees = expectedTotal;
                await client.save();
            }
        }

        console.log('Finished repairing client limits.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

repairClients();
