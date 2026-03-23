import mongoose from 'mongoose';

const onboardingDocSettingSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    requirementType: {
        type: String,
        enum: ['Always Required', 'Never Required', 'Custom'],
        default: 'Always Required'
    },
    customDocuments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentType'
    }]
}, { timestamps: true });

const OnboardingDocSetting = mongoose.model('OnboardingDocSetting', onboardingDocSettingSchema);

export default OnboardingDocSetting;
