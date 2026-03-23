import GraceTime from '../models/GraceTime.Model.js';
import Shift from '../models/Shift.Model.js';

export const getGraceTimes = async (req, res) => {
    try {
        const adminId = req.user._id;
        const graceTimes = await GraceTime.find({ adminId });
        res.status(200).json(graceTimes);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addGraceTime = async (req, res) => {
    try {
        const { shiftIds, slabs } = req.body; // Expecting shiftIds array
        const adminId = req.user._id;

        if (!shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
            return res.status(400).json({ success: false, message: "Please select at least one shift" });
        }

        const results = [];
        for (const shiftId of shiftIds) {
            const shift = await Shift.findById(shiftId);
            if (!shift) continue;

            // Check if rule already exists for this shift
            const existingRule = await GraceTime.findOne({ shiftId, adminId });
            
            if (existingRule) {
                existingRule.slabs = slabs;
                existingRule.shiftName = shift.shiftName;
                await existingRule.save();
                results.push({ shiftId, status: 'updated' });
            } else {
                const newGraceTime = new GraceTime({
                    shiftId,
                    shiftName: shift.shiftName,
                    slabs,
                    adminId
                });
                await newGraceTime.save();
                results.push({ shiftId, status: 'created' });
            }
        }

        res.status(200).json({ 
            success: true, 
            message: `Grace time rules saved for ${results.length} shift(s)`,
            results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateGraceTime = async (req, res) => {
    try {
        const { id } = req.params;
        const { shiftId, shiftName, slabs } = req.body;
        const adminId = req.user._id;

        const updatedRule = await GraceTime.findOneAndUpdate(
            { _id: id, adminId },
            { shiftId, shiftName, slabs },
            { new: true }
        );

        if (!updatedRule) {
             return res.status(404).json({ success: false, message: "Rule not found" });
        }

        res.status(200).json({ success: true, rule: updatedRule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteGraceTime = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;
        
        const deletedRule = await GraceTime.findOneAndDelete({ _id: id, adminId });

        if (!deletedRule) {
             return res.status(404).json({ success: false, message: "Rule not found" });
        }

        res.status(200).json({ success: true, message: "Configuration deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

