import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    shiftStart: { type: String, default: '' },
    shiftEnd: { type: String, default: '' },
    lunchStart: { type: String, default: '' },
    lunchEnd: { type: String, default: '' },
    teaStart: { type: String, default: '' },
    teaEnd: { type: String, default: '' },
    threeQuarterAfter: { type: String, default: '' },
    threeQuarterBefore: { type: String, default: '' },
    halfDayAfter: { type: String, default: '' },
    halfDayBefore: { type: String, default: '' },
    quarterDayAfter: { type: String, default: '' },
    quarterDayBefore: { type: String, default: '' },
    lateCountAfter: { type: Number, default: 0 },
    earlyCountBefore: { type: Number, default: 0 },
    minQuarterHours: { type: Number, default: 0 },
    minHalfHours: { type: Number, default: 0 },
    minThreeQuarterHours: { type: Number, default: 0 },
    minFullDayHours: { type: Number, default: 0 },
    maxPersonalBreak: { type: Number, default: 0 },
    maxPunchOutTime: { type: String, default: '' },
    maxPunchOutHour: { type: String, default: '' }
}, { _id: false });

const shiftSchema = new mongoose.Schema({
    // Basic Shift Details
    shiftName: { type: String, required: true, trim: true },
    shiftCode: { type: String, trim: true },
    multiplePunchAllowed: { type: Boolean, default: false },
    requireOutOfRangeReason: { type: Boolean, default: false },
    hoursType: { type: String, enum: ['Full Shift Hours', 'Productive Hours', 'Flexible Hours'], default: 'Full Shift Hours' },
    attendanceOnProductiveHours: { type: Boolean, default: false },
    deductBreakIfNotTaken: { type: Boolean, default: false },
    deductFullBreakIfLessTaken: { type: Boolean, default: false },
    attendanceRequestRemarkPolicy: { type: String, enum: ['None', 'Optional', 'Mandatory'], default: 'None' },
    missingPunchRemarkPolicy: { type: String, enum: ['None', 'Optional', 'Mandatory'], default: 'None' },
    outOfRangeRemarkPolicy: { type: String, enum: ['None', 'Optional', 'Mandatory'], default: 'None' },
    missingPunchRequestDays: { type: Number, default: 0 },
    pastAttendanceRequestDays: { type: Number, default: 0 },
    autoSelectAlternateShift: { type: Boolean, default: false },
    allowAttendanceModification: { type: Boolean, default: false },

    // Week Off Settings
    weekOffType: { type: String, enum: ['Selected Weekdays', 'Alternate Week Off', 'Rotational Week Off', 'Manual Week Off', 'Auto Week off'], default: 'Selected Weekdays' },
    weekOffDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    weekOffsPerWeek: { type: Number, default: 0 },
    weekOffsPerMonth: { type: Number, default: 0 },
    hasAlternateWeekOff: { type: Boolean, default: false },

    // Late In / Early Out Settings
    lateEarlyType: { type: String, enum: ['Combined', 'Separate'], default: 'Combined' },
    maxLateInMinutes: { type: Number, default: 0 },
    maxEarlyOutMinutes: { type: Number, default: 0 },
    applyLeaveIfLimitExceeded: { type: Boolean, default: false },
    leaveTypeIfExceeded: { type: String, enum: ['Half Day', 'Full Day', 'Short Leave'], default: 'Half Day' },
    requireLateReason: { type: Boolean, default: false },
    requireEarlyOutReason: { type: Boolean, default: false },
    lateEarlyApplyOnExtraDay: { type: Boolean, default: false },
    deductLatePenaltyFromWorkHours: { type: Boolean, default: false },
    removeLateEarlyAfterFullHours: { type: Boolean, default: false },

    // Leave Settings
    allowShortLeave: { type: Boolean, default: false },
    monthlyShortLeaves: { type: Number, default: 0 },
    shortLeaveMinutes: { type: Number, default: 0 },
    shortLeaveType: { type: String, enum: ['Default', 'Before Shift', 'After Shift', 'Both'], default: 'Default' },
    shortLeaveBufferMinutes: { type: Number, default: 0 },
    shortLeaveDays: { type: String, default: '' },
    applySandwichLeave: { type: Boolean, default: false },
    applyHalfDayBeforeFixedTimeout: { type: Boolean, default: false },
    applyLeaveOnHoliday: { type: Boolean, default: false },
    applyLeaveOnWeekOff: { type: Boolean, default: false },

    // Penalty Settings
    generatePenaltyOnAbsent: { type: Boolean, default: false },
    penaltyType: { type: String, enum: ['Flat', 'Percentage'], default: 'Flat' },
    penaltyValue: { type: Number, default: 0 },

    // OT Settings
    extraDayApprovalPolicy: { type: String, enum: ['None', 'Week Off', 'Holiday', 'Week off and holiday'], default: 'None' },
    needApprovalExtraHoursWeekdays: { type: Boolean, default: false },
    needOTRequestSameDay: { type: Boolean, default: false },
    otRequestType: { type: String, enum: ['Get approval before overtime work', 'Get approval after overtime work'], default: 'Get approval before overtime work' },
    extraPayoutMultiplier: { type: String, enum: ['Default', '1x', '1.5x', '2x'], default: 'Default' },

    // Comp Off Leave
    compOffOnExtraDay: { type: Boolean, default: false },
    compOffOnExtraHoursWorkingDay: { type: Boolean, default: false },
    compOffExpiryType: { type: String, enum: ['None', 'Custom Days', 'End of Month', 'End of Quarter', 'End of Year'], default: 'None' },
    compOffExpireDays: { type: Number, default: 0 },
    maxCompOffInMonth: { type: Number, default: 0 },
    applyCompOffOnPastDate: { type: Boolean, default: false },
    excludeCompOffWithAutoLeave: { type: Boolean, default: false },

    // Break Settings
    breakMode: { type: String, enum: ['Defined Minutes', 'Anytime Between Shift'], default: 'Defined Minutes' },
    breakApprovalFaceApp: { type: Boolean, default: false },
    breakApprovalEmployeeApp: { type: Boolean, default: false },

    // Weekly Schedule
    sameRulesForAllDays: { type: Boolean, default: false },
    flexibleShiftHours: { type: Boolean, default: false },
    schedule: {
        monday: { type: scheduleSchema, default: () => ({}) },
        tuesday: { type: scheduleSchema, default: () => ({}) },
        wednesday: { type: scheduleSchema, default: () => ({}) },
        thursday: { type: scheduleSchema, default: () => ({}) },
        friday: { type: scheduleSchema, default: () => ({}) },
        saturday: { type: scheduleSchema, default: () => ({}) },
        sunday: { type: scheduleSchema, default: () => ({}) }
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
shiftSchema.index({ shiftName: 1 }, { unique: true });
shiftSchema.index({ shiftCode: 1 }, { unique: true, sparse: true });
shiftSchema.index({ isActive: 1 });
shiftSchema.index({ createdAt: -1 });

// Virtual for employee count
shiftSchema.virtual('employeeCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'workSetup.shift',
    count: true
});

export default mongoose.model('Shift', shiftSchema);
