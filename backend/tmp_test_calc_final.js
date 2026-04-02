import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.Model.js';
import EmployeeCTC from './models/EmployeeCTC.Model.js';
import SalaryGroup from './models/SalaryGroup.Model.js';
import Attendance from './models/Attendance.Model.js';
import Request from './models/Request.Model.js';

async function calculateFinal() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        const user = await User.findOne({ employeeId: 'IFLORA-0004' }).populate('workSetup.salaryGroup');
        if (!user) return console.log("User Jaimil not found");

        const salaryGroup = user.workSetup?.salaryGroup;
        if (!salaryGroup) return console.log("Salary Group not assigned to Jaimil");

        const ctc = await EmployeeCTC.findOne({ employeeId: user._id, status: 'Active' });
        if (!ctc) return console.log("Active CTC not found for Jaimil");

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

        // --- CALCULATION LOGIC AS PER SALARY GROUP ---
        const isFixed = salaryGroup.workingDaysType === 'Fixed Working Days';
        const baseDays = isFixed ? (salaryGroup.fixedDays || 26) : 31;
        
        const perDayGross = (ctc.monthlyGross || 0) / baseDays;
        const perDayNet = (ctc.netSalary || 0) / baseDays;

        let accruedGross, accruedNet, unpaidLeaveDeduction;

        if (isFixed) {
            unpaidLeaveDeduction = perDayGross * unpaidLeaves;
            accruedGross = Math.max(0, (ctc.monthlyGross || 0) - unpaidLeaveDeduction);
            accruedNet = Math.max(0, (ctc.netSalary || 0) - unpaidLeaveDeduction - monthPenalty);
        } else {
            const payableDays = presentDays + weekOffs + holidays + paidLeaves;
            unpaidLeaveDeduction = perDayGross * unpaidLeaves;
            accruedGross = perDayGross * payableDays;
            accruedNet = (perDayNet * payableDays) - monthPenalty;
        }

        console.log("\n--- Jaimil March 2026 Payout ---");
        console.log(`Salary Group: ${salaryGroup.groupName}`);
        console.log(`Model: ${salaryGroup.workingDaysType} | Base: ${baseDays} Days`);
        console.log(`Monthly Gross: ${ctc.monthlyGross} | Monthly Net: ${ctc.netSalary}`);
        console.log("--------------------------------");
        console.log(`Attendance -> Present: ${presentDays} | WeekOff: ${weekOffs} | Holiday: ${holidays}`);
        console.log(`Leaves -> Paid: ${paidLeaves} | Unpaid (LOP): ${unpaidLeaves}`);
        console.log(`Penalties: ${monthPenalty}`);
        console.log("--------------------------------");
        console.log(`Unpaid Leave Deduction: ${unpaidLeaveDeduction.toFixed(2)}`);
        console.log(`Final Accrued Gross: ${accruedGross.toFixed(2)}`);
        console.log(`Final Net Payout: ${accruedNet.toFixed(2)}`);
        console.log("--------------------------------\n");

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

calculateFinal();
