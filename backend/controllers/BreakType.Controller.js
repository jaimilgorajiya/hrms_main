import BreakType from "../models/BreakType.Model.js";

// Add Break Type
export const addBreakType = async (req, res) => {
    try {
        const { name, minutes } = req.body;
        const adminId = req.user._id;

        if (!name) {
            return res.status(400).json({ success: false, message: "Break name is required" });
        }

        const count = await BreakType.countDocuments({ adminId });

        const newBreakType = new BreakType({
            name,
            minutes: minutes || "As Per Shift",
            adminId,
            order: count
        });

        await newBreakType.save();
        res.status(201).json({ success: true, message: "Break type added successfully", breakType: newBreakType });
    } catch (error) {
        console.error("Error in addBreakType:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Break type with this name already exists" });
        }
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Get Break Types
export const getBreakTypes = async (req, res) => {
    try {
        const adminId = req.user._id;
        const breakTypes = await BreakType.find({ adminId }).sort({ order: 1 });
        res.status(200).json({ success: true, breakTypes });
    } catch (error) {
        console.error("Error in getBreakTypes:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Update Break Type
export const updateBreakType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, minutes, isActive } = req.body;
        const adminId = req.user._id;

        const updatedBreakType = await BreakType.findOneAndUpdate(
            { _id: id, adminId },
            { name, minutes, isActive },
            { new: true, runValidators: true }
        );

        if (!updatedBreakType) {
            return res.status(404).json({ success: false, message: "Break type not found" });
        }

        res.status(200).json({ success: true, message: "Break type updated successfully", breakType: updatedBreakType });
    } catch (error) {
        console.error("Error in updateBreakType:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Break type with this name already exists" });
        }
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Delete Break Type
export const deleteBreakType = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const deleted = await BreakType.findOneAndDelete({ _id: id, adminId });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Break type not found" });
        }

        res.status(200).json({ success: true, message: "Break type deleted successfully" });
    } catch (error) {
        console.error("Error in deleteBreakType:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Bulk Delete
export const bulkDeleteBreakTypes = async (req, res) => {
    try {
        const { ids } = req.body; // Array of IDs
        const adminId = req.user._id;

        if (!ids || !ids.length) {
            return res.status(400).json({ success: false, message: "No IDs provided" });
        }

        await BreakType.deleteMany({ _id: { $in: ids }, adminId });
        res.status(200).json({ success: true, message: "Break types deleted successfully" });
    } catch (error) {
        console.error("Error in bulkDeleteBreakTypes:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
