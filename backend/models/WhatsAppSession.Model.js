import mongoose from 'mongoose';

/**
 * WhatsAppSession — Stores temporary conversation state for multi-step chatbot flows.
 * e.g. when an employee starts applying for leave, we need to ask them multiple
 * follow-up questions (leave type → from date → to date → reason).
 * This model acts as the bot's short-term memory for each phone number.
 * Sessions auto-expire after 10 minutes of inactivity.
 */
const whatsAppSessionSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Which multi-step flow is active: 'apply_leave' | 'none'
    flow: {
        type: String,
        default: 'none'
    },
    // Current step within the flow
    // For apply_leave: 'awaiting_leave_type' | 'awaiting_from_date' | 'awaiting_to_date' | 'awaiting_reason' | 'confirming'
    step: {
        type: String,
        default: null
    },
    // Data collected so far in this flow
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Auto-expire session after 10 minutes
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 60 * 1000),
        expires: 0 // Mongoose TTL index: auto-delete when expiresAt is passed
    }
}, { timestamps: true });

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsAppSessionSchema);
export default WhatsAppSession;
