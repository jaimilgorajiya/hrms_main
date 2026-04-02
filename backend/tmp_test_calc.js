import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.Model.js';
import EmployeeCTC from './models/EmployeeCTC.Model.js';
import SalaryGroup from './models/SalaryGroup.Model.js';
import Attendance from './models/Attendance.Model.js';
import Request from './models/Request.Model.js';

async function calculateTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        const user = await User.findOne({ employeeId: 'IFLORA-0004' }).populate('workSetup.salaryGroup');
        if (!user) return console.log("User not found");

        const ctc = await EmployeeCTC.findOne({ employeeId: user._id, status: 'Active' });
        if (!ctc) return console.log("CTC not found for user");

        const salaryGroup = user.workSetup?.salaryGroup;
        if (!salaryGroup) return console.log("Salary Group not assigned to user");

        const start = "2026-03-01";
        const end = "2026-03-31";

        const attendance = await Attendance.find({
            employee: user._id,
            date: { $gte: start, $lte: end }
        });

        const paidLeaves = await Request.countDocuments({
            employee: user._id,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Paid',
            date: { $gte: start, $lte: end }
        });

        const unpaidLeaves = await Request.countDocuments({
            employee: user._id,
            requestType: 'Leave',
            status: 'Approved',
            leaveCategory: 'Unpaid',
            date: { $gte: start, $lte: end }
        });

        const presentDays = attendance.filter(a => a.status === 'Present').length;
        const weekOffs = attendance.filter(a => a.status === 'Week Off').length;
        const holidays = attendance.filter(a => a.status === 'Holiday').length;
        
        const monthPenalty = attendance.reduce((acc, a) => acc + (a.lateInPenalty?.amount || 0) + (a.earlyOutPenalty?.amount || 0), 0);

        // CALCULATION
        const baseDays = salaryGroup.workingDaysType === 'Fixed Working Days' ? (salaryGroup.fixedDays || 26) : 31;
        const perDayGross = ctc.monthlyGross / baseDays;
        const perDayNet = ctc.netSalary / baseDays;

        let accruedGross, accruedNet, unpaidLeaveDeduction;

        if (salaryGroup.workingDaysType === 'Fixed Working Days') {
            unpaidLeaveDeduction = perDayGross * unpaidLeaves;
            accruedGross = ctc.monthlyGross - unpaidLeaveDeduction;
            accruedNet = ctc.netSalary - unpaidLeaveDeduction - monthPenalty;
        } else {
            const payableDays = presentDays + weekOffs + holidays + paidLeaves;
            unpaidLeaveDeduction = perDayGross * unpaidLeaves;
            accruedGross = perDayGross * payableDays;
            accruedNet = (perDayNet * payableDays) - monthPenalty;
        }

        console.log("\n--- TEST CASE CALCULATION (MARCH 2026) ---");
        console.log(`Employee: ${user.name} (${user.employeeId})`);
        console.log(`Salary Group: ${salaryGroup.groupName} (${salaryGroup.workingDaysType})`);
        console.log(`Fixed Base: ${baseDays} Days`);
        console.log(`Monthly Gross: ${ctc.monthlyGross}`);
        console.log(`Monthly Net: ${ctc.netSalary}`);
        console.log("------------------------------------------");
        console.log(`Present: ${presentDays} | Paid Leave: ${paidLeaves} | Unpaid Leave: ${unpaidLeaves}`);
        console.log(`Week Offs: ${weekOffs} | Holidays: ${holidays} | Penalties: ${monthPenalty}`);
        console.log("------------------------------------------");
        console.log(`Unpaid Leave Deduction: ${unpaidLeaveDeduction.toFixed(2)}`);
        console.log(`Accrued Gross: ${accruedGross.toFixed(2)}`);
        console.log(`Final Accrued Payout (Net): ${accruedNet.toFixed(2)}`);
        console.log("------------------------------------------\n");

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

calculateTest();
