import LeaveType from '../models/LeaveType.Model.js';
import User from '../models/User.Model.js';

export const getLeaveTypes = async (req, res) => {
    try {
        let adminId = req.user._id;
        
        // If employee, find their assigned admin
        if (req.user.role !== 'Admin') {
            const user = await User.findById(req.user._id);
            if (user && user.adminId) {
                adminId = user.adminId;
            }
        }

        const leaveTypes = await LeaveType.find({ adminId, status: 'Active' });
        res.status(200).json({ success: true, leaveTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addLeaveType = async (req, res) => {
    try {
        const adminId = req.user._id;
        const leaveType = new LeaveType({
            ...req.body,
            adminId
        });
        await leaveType.save();
        res.status(201).json({ success: true, message: "Leave Type added successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateLeaveType = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const updatedLeaveType = await LeaveType.findOneAndUpdate(
            { _id: id, adminId },
            req.body,
            { new: true }
        );

        if (!updatedLeaveType) {
            return res.status(404).json({ success: false, message: "Leave Type not found" });
        }

        res.status(200).json({ success: true, message: "Leave Type updated successfully", leaveType: updatedLeaveType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteLeaveType = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const deletedLeaveType = await LeaveType.findOneAndDelete({ _id: id, adminId });

        if (!deletedLeaveType) {
            return res.status(404).json({ success: false, message: "Leave Type not found" });
        }

        res.status(200).json({ success: true, message: "Leave Type deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const leaveType = await LeaveType.findOne({ _id: id, adminId });
        if (!leaveType) {
            return res.status(404).json({ success: false, message: "Leave Type not found" });
        }

        leaveType.status = leaveType.status === 'Active' ? 'Inactive' : 'Active';
        await leaveType.save();

        res.status(200).json({ success: true, message: `Leave Type is now ${leaveType.status}`, status: leaveType.status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const bulkDeleteLeaveTypes = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user._id;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "No IDs provided" });
        }

        const result = await LeaveType.deleteMany({ _id: { $in: ids }, adminId });

        res.status(200).json({ success: true, message: `${result.deletedCount} Leave Types deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

