import mongoose from 'mongoose';

const retirementSettingSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    defaultRetirementAge: {
        type: Number,
        required: true,
        default: 60,
        min: 40,
        max: 80
    },
    enableRoleBasedAge: { type: Boolean, default: false },
    enableDepartmentBasedAge: { type: Boolean, default: false },
    // Role-based overrides: [{ roleName, retirementAge }]
    roleAgeOverrides: [{
        roleName: { type: String },
        retirementAge: { type: Number, min: 40, max: 80 }
    }],
    // Department-based overrides: [{ departmentName, retirementAge }]
    departmentAgeOverrides: [{
        departmentName: { type: String },
        retirementAge: { type: Number, min: 40, max: 80 }
    }],
    // Notification days before retirement e.g. [30, 90, 180, 365]
    notificationDays: {
        type: [Number],
        default: [30, 90, 180]
    },
    autoInitiateExit: { type: Boolean, default: false },
    allowExtension: { type: Boolean, default: false },
    maxExtensionMonths: { type: Number, default: 12 },
    noticePeriodDays: { type: Number, default: 30 }
}, { timestamps: true });

export default mongoose.model('RetirementSetting', retirementSettingSchema);
