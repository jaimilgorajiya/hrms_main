import mongoose from 'mongoose';

const documentTypeSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    shortName: {
        type: String,
        trim: true
    },
    pages: {
        type: Number,
        default: 1
    },
    documentNumberRequired: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    allowDocumentType: {
        type: String,
        enum: ['Image And PDF', 'Image Only', 'PDF Only'],
        default: 'Image And PDF'
    },
    issueDateRequired: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    expiryDateRequired: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    requiredBeforeOnboarding: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No'
    },
    kycType: {
        type: String,
        default: ''
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const DocumentType = mongoose.model('DocumentType', documentTypeSchema);

export default DocumentType;
