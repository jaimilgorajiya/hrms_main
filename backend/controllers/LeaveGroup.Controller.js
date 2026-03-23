import LeaveGroup from '../models/LeaveGroup.Model.js';

export const getLeaveGroups = async (req, res) => {
    try {
        const leaveGroups = await LeaveGroup.find({ adminId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, leaveGroups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLeaveGroupById = async (req, res) => {
    try {
        const leaveGroup = await LeaveGroup.findOne({ _id: req.params.id, adminId: req.user._id });
        if (!leaveGroup) return res.status(404).json({ success: false, message: 'Leave Group not found' });
        res.status(200).json({ success: true, leaveGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addLeaveGroup = async (req, res) => {
    try {
        const leaveGroup = new LeaveGroup({ ...req.body, adminId: req.user._id });
        await leaveGroup.save();
        res.status(201).json({ success: true, message: 'Leave Group added successfully', leaveGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateLeaveGroup = async (req, res) => {
    try {
        const leaveGroup = await LeaveGroup.findOneAndUpdate(
            { _id: req.params.id, adminId: req.user._id },
            req.body,
            { new: true }
        );
        if (!leaveGroup) return res.status(404).json({ success: false, message: 'Leave Group not found' });
        res.status(200).json({ success: true, message: 'Leave Group updated successfully', leaveGroup });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteLeaveGroup = async (req, res) => {
    try {
        const leaveGroup = await LeaveGroup.findOneAndDelete({ _id: req.params.id, adminId: req.user._id });
        if (!leaveGroup) return res.status(404).json({ success: false, message: 'Leave Group not found' });
        res.status(200).json({ success: true, message: 'Leave Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleLeaveGroupStatus = async (req, res) => {
    try {
        const leaveGroup = await LeaveGroup.findOne({ _id: req.params.id, adminId: req.user._id });
        if (!leaveGroup) return res.status(404).json({ success: false, message: 'Leave Group not found' });
        leaveGroup.status = leaveGroup.status === 'Active' ? 'Inactive' : 'Active';
        await leaveGroup.save();
        res.status(200).json({ success: true, message: `Leave Group is now ${leaveGroup.status}`, status: leaveGroup.status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const bulkDeleteLeaveGroups = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        const result = await LeaveGroup.deleteMany({ _id: { $in: ids }, adminId: req.user._id });
        res.status(200).json({ success: true, message: `${result.deletedCount} Leave Groups deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
