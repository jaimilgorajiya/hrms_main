import Notification from "../models/Notification.Model.js";

export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
        const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

        res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error("getMyNotifications error:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        await Notification.findOneAndUpdate({ _id: notificationId, user: userId }, { isRead: true });

        res.status(200).json({ success: true, message: "Notification marked as read" });
    } catch (error) {
        console.error("markAsRead error:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const markAllRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });

        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error("markAllRead error:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
