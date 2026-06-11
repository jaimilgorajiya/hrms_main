import mongoose from 'mongoose';

const salarySlipSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        month: { type: Number, required: true, min: 1, max: 12 },
        year:  { type: Number, required: true },

        // Snapshot of employee at time of generation
        branch:      { type: String, default: '' },
        department:  { type: String, default: '' },
        designation: { type: String, default: '' },
        salaryGroup: { type: String, default: '' },
        // salaryType:  { type: String, default: 'Per Day Salary Month Wise' },

        // Days / Attendance
        monthWorkingDays:    { type: Number, default: 0 },
        employeeWorkingDays: { type: Number, default: 0 },
        paidLeave:           { type: Number, default: 0 },
        unpaidLeave:         { type: Number, default: 0 },
        totalLeaves:         { type: Number, default: 0 },
        extraDays:           { type: Number, default: 0 },
        extraDaysPaid:       { type: Number, default: 0 },
        paidHolidays:        { type: Number, default: 0 },
        paidWeekOff:         { type: Number, default: 0 },
                     
        // Salary figures
        joiningNetSalary:    { type: Number, default: 0 },
        joiningMonthlyGross: { type: Number, default: 0 },
        thisMonthGross:      { type: Number, default: 0 },
        perDaySalary:        { type: Number, default: 0 },
        perDaySalaryExtra:   { type: Number, default: 0 },

        // Earnings breakdown (proportionally calculated)
        earnings: [
            {
                componentName:    { type: String },
                monthlyAmount:    { type: Number, default: 0 },
                calculatedAmount: { type: Number, default: 0 }
            }
        ],

        // Deductions from CTC
        deductions: [
            {
                componentName: { type: String },
                amount:        { type: Number, default: 0 }
            }
        ],

        otherEarnings:   { type: Number, default: 0 },
        otherDeduction:  { type: Number, default: 0 },
        totalEarnings:   { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        netSalary:       { type: Number, default: 0 },

        description: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Draft', 'Generated', 'Published'],
            default: 'Generated'
        }
    },
    { timestamps: true }
);

// One slip per employee per month/year (upsert-safe)
salarySlipSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const SalarySlip = mongoose.model('SalarySlip', salarySlipSchema);
export default SalarySlip;
