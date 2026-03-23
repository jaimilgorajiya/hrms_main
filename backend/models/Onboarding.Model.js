import mongoose from "mongoose";

const onboardingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true, 
        unique: true
    },
    joiningDate: { type: Date },
    status: {
        type: String,
        enum: ['Pre-Boarding', 'Pending Documents', 'IT Setup', 'Induction', 'Completed'],
        default: 'Pre-Boarding'
    },
    checklist: {
        welcomeEmailSent: { type: Boolean, default: false },
        officeTour: { type: Boolean, default: false },
        idCardIssued: { type: Boolean, default: false },
        policyAcknowledgement: { type: Boolean, default: false },
        contractSigned: { type: Boolean, default: false }
    },
    itSetup: {
        emailCreated: { type: Boolean, default: false },
        laptopAssigned: { type: Boolean, default: false },
        slackAccess: { type: Boolean, default: false },
        jiraAccess: { type: Boolean, default: false },
        githubAccess: { type: Boolean, default: false }
    },
    documents: {
        offerLetter: { status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Pending' }, url: String },
        idProof: { status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Pending' }, url: String },
        educationalCertificates: { status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Pending' }, url: String },
        previousRelievingLetter: { status: { type: String, enum: ['Pending', 'Submitted', 'Verified'], default: 'Pending' }, url: String }
    },
    buddy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    inductionDate: { type: Date },
    comments: { type: String }
}, { timestamps: true });

export default mongoose.model("Onboarding", onboardingSchema);
