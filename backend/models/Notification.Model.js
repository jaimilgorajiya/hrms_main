import mongoose from 'mongoose';
import { getIO } from '../utils/socket.js';

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["Attendance", "Leave", "Salary", "Other"],
        default: "Other"
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.post('save', function (doc) {
    try {
        const io = getIO();
        if (io) {
            io.to(`user_${doc.user.toString()}`).emit('new_notification', doc);
            console.log(`📡 Real-time notification emitted to user_${doc.user}`);
        }
    } catch (err) {
        console.error('Error emitting real-time notification:', err.message);
    }
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
