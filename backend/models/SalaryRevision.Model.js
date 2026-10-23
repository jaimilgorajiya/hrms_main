import mongoose from 'mongoose';

/**
 * SalaryRevision Model
 * Tracks every salary increment / decrement event for an employee.
 * When a revision is applied the employee's EmployeeCTC record is
 * also updated; this model keeps the full audit trail.
 *
 * Backdated support:
 *  - If effectiveDate is before the current calendar month the system
 *    computes arrears (missed salary difference for each past month).
 *  - arrearsMonths lists every YYYY-MM that is affected.
 *  - arrearsAmount is the total cumulative difference due.
 *  - arrearsStatus tracks whether those arrears have been settled.
 */
const salaryRevisionSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ── Revision metadata ─────────────────────────────────────────
    revisionType: {
        type: String,
        enum: ['Increment', 'Decrement'],
        required: true
    },

    // How the change was expressed by the admin
    adjustmentMode: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    adjustmentValue: {
        // Percentage (e.g. 10 for 10%) or absolute amount in INR
        type: Number,
        required: true
    },

    effectiveDate: {
        type: Date,
        required: true
    },

    remark: {
        type: String,
        default: ''
    },

    // ── Backdated Arrears ─────────────────────────────────────────
    isBackdated: {
        // true when effectiveDate is before the current calendar month
        type: Boolean,
        default: false
    },
    arrearsMonths: [
        // Each entry represents one affected calendar month
        {
            month: Number,        // 1–12
            year: Number,         // e.g. 2025
            monthStr: String,     // "YYYY-MM" for easy lookup
            monthlyDelta: Number, // newMonthlyGross - prevMonthlyGross for that month
            slipExists: { type: Boolean, default: false }, // slip already generated?
            slipId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalarySlip', default: null }
        }
    ],
    arrearsAmount: {
        // Total arrears = sum of monthlyDelta across all affected months
        type: Number,
        default: 0
    },
    arrearsStatus: {
        type: String,
        enum: ['None', 'Pending', 'Settled', 'Partial'],
        default: 'None'
    },
    arrearsSettledAt: { type: Date },
    arrearsSettledRemark: { type: String, default: '' },

    // ── Salary snapshot BEFORE revision ──────────────────────────
    previousAnnualCTC: { type: Number, required: true },
    previousMonthlyGross: { type: Number, required: true },
    previousNetSalary: { type: Number, required: true },
    previousEarnings: [{
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningDeductionType' },
        componentName: String,
        amount: Number,
        isTaxable: { type: Boolean, default: true },
        category: { type: String, default: 'Fixed' }
    }],
    previousDeductions: [{
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningDeductionType' },
        componentName: String,
        amount: Number
    }],

    // ── Salary snapshot AFTER revision ───────────────────────────
    newAnnualCTC: { type: Number, required: true },
    newMonthlyGross: { type: Number, required: true },
    newNetSalary: { type: Number, required: true },
    newEarnings: [{
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningDeductionType' },
        componentName: String,
        amount: Number,
        isTaxable: { type: Boolean, default: true },
        category: { type: String, default: 'Fixed' }
    }],
    newDeductions: [{
        componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningDeductionType' },
        componentName: String,
        amount: Number
    }],

    // Derived delta for quick reporting
    deltaAmount: { type: Number, required: true }, // newAnnualCTC - previousAnnualCTC
    deltaPercentage: { type: Number, required: true }, // % change in annual CTC

    status: {
        type: String,
        enum: ['Applied', 'Pending', 'Reverted'],
        default: 'Applied'
    }
}, { timestamps: true });

// Compound index for fast per-employee queries
salaryRevisionSchema.index({ employeeId: 1, effectiveDate: -1 });
salaryRevisionSchema.index({ adminId: 1, createdAt: -1 });

const SalaryRevision = mongoose.model('SalaryRevision', salaryRevisionSchema);
export default SalaryRevision;