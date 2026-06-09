import 'dotenv/config';
import connectDB from '../config/db.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import User from '../models/User.Model.js';

const run = async () => {
    await connectDB();
    const ctcs = await EmployeeCTC.find({}).populate('employeeId');
    for (const ctc of ctcs) {
        console.log(`Employee: ${ctc.employeeId?.name} (${ctc.employeeId?.email})`);
        console.log(`Root: Gross = ${ctc.monthlyGross}, Net = ${ctc.netSalary}, Effective = ${ctc.effectiveDate.toISOString()}`);
        (ctc.history || []).forEach((h, i) => {
            console.log(`  History [${i}]: Gross = ${h.monthlyGross}, Net = ${h.netSalary}, Effective = ${h.effectiveDate?.toISOString()}, End = ${h.endDate?.toISOString()}, Updated = ${h.updatedAt?.toISOString()}`);
        });
    }
    process.exit(0);
};
run();
