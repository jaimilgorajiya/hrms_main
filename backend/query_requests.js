import dotenv from 'dotenv';
import mongoose from 'mongoose';
import './models/User.Model.js';
import './models/Request.Model.js';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const Request = mongoose.model('Request');
    
    const requests = await Request.find().sort({ createdAt: -1 }).limit(10).populate('employee', 'name');
    requests.forEach(r => {
        console.log(`Emp: ${r.employee?.name}, Type: ${r.requestType}, Date: ${r.date || r.fromDate}, Status: ${r.status}, Reason: ${r.reason}, Error/Remarks: ${r.adminRemark}`);
    });
    
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
