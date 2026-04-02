import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.Model.js';
import EmployeeCTC from './models/EmployeeCTC.Model.js';
import SalaryGroup from './models/SalaryGroup.Model.js';
import Attendance from './models/Attendance.Model.js';
import Request from './models/Request.Model.js';

async function jaimilReport() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ employeeId: 'IFLORA-0004' }).populate('workSetup.salaryGroup');
    const ctc = await EmployeeCTC.findOne({ employeeId: user._id, status: 'Active' });
    const salaryGroup = user.workSetup?.salaryGroup;

    const start = "2026-03-01";
    const end = "2026-03-31";
    const attendance = await Attendance.find({ employee: user._id, date: { $gte: start, $lte: end } });

    const usedPaidLeaves = await Request.countDocuments({
        employee: user._id,
        requestType: 'Leave', status: 'Approved', leaveCategory: 'Paid',
        date: { $gte: start, $lte: end }
    });

    const usedUnpaidLeaves = await Request.countDocuments({
        employee: user._id,
        requestType: 'Leave', status: 'Approved', leaveCategory: 'Unpaid',
        date: { $gte: start, $lte: end }
    });

    const presentDays = attendance.filter(a => a.status === 'Present').length;
    const weekOffs = attendance.filter(a => a.status === 'Week Off').length;
    const holidays = attendance.filter(a => a.status === 'Holiday').length;
    const absents = attendance.filter(a => a.status === 'Absent').length;
    
    // Total calendar days = 31
    const missingDays = 31 - attendance.length;
    
    const monthPenalty = attendance.reduce((acc, a) => acc + (a.lateInPenalty?.amount || 0) + (a.earlyOutPenalty?.amount || 0), 0);

    const baseDays = salaryGroup.workingDaysType === 'Fixed Working Days' ? (salaryGroup.fixedDays || 26) : 31;
    const dailyGross = ctc.monthlyGross / baseDays;
    const dailyNet = ctc.netSalary / baseDays;

    const payableDays = presentDays + weekOffs + holidays + usedPaidLeaves;
    
    // ACCRUED CALCULATION
    let accruedGross = dailyGross * payableDays;
    let accruedNet = (dailyNet * payableDays) - monthPenalty;

    // CAP AT 100% if working all days in 31 month with 28 base
    accruedGross = Math.min(ctc.monthlyGross, accruedGross);
    accruedNet = Math.min(ctc.netSalary, accruedNet);

    console.log("--- FINAL MARCH REPORT FOR JAIMIL ---");
    console.log(`Set Net Salary: ${ctc.netSalary}`);
    console.log(`Salary Group: ${salaryGroup.groupName} (${salaryGroup.workingDaysType})`);
    console.log(`Fixed Base: ${baseDays} Days`);
    console.log(`Daily Net Rate: ${dailyNet.toFixed(2)}`);
    console.log("-------------------------------------");
    console.log(`Present Days: ${presentDays}`);
    console.log(`WeekOff/Holidays in DB: ${weekOffs + holidays}`);
    console.log(`Paid Leaves: ${usedPaidLeaves}`);
    console.log(`TOTAL PAYABLE DAYS: ${payableDays}`);
    console.log("-------------------------------------");
    console.log(`Absents (Explicit + Missing): ${absents + missingDays}`);
    console.log(`Unpaid Leaves: ${usedUnpaidLeaves}`);
    console.log(`Total Attendance Penalties: ${monthPenalty}`);
    console.log("-------------------------------------");
    console.log(`FINAL PAYOUT (ACCURED): ${accruedNet.toFixed(2)}`);
    console.log("-------------------------------------");

    process.exit(0);
}
jaimilReport();
