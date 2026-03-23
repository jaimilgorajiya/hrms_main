import PenaltyRule from '../models/PenaltyRule.Model.js';
import Shift from '../models/Shift.Model.js';

// Get penalty rule by shift ID
export const getPenaltyRuleByShift = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const penaltyRule = await PenaltyRule.findOne({ shift: shiftId });
        
        if (!penaltyRule) {
            return res.status(200).json({ 
                success: true, 
                penaltyRule: { shift: shiftId, slabs: [] } 
            });
        }

        res.status(200).json({ success: true, penaltyRule });
    } catch (error) {
        console.error('Error fetching penalty rule:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch penalty rule' });
    }
};

// Create or Update penalty rule for a shift
export const savePenaltyRule = async (req, res) => {
    try {
        const { shiftId, slabs } = req.body;
        const adminId = req.user.id; // Assuming req.user.id is the admin/creator

        let penaltyRule = await PenaltyRule.findOne({ shift: shiftId });

        if (penaltyRule) {
            // Update existing
            penaltyRule.slabs = slabs;
            await penaltyRule.save();
        } else {
            // Create new
            penaltyRule = new PenaltyRule({
                shift: shiftId,
                slabs,
                createdBy: adminId,
                adminId: adminId
            });
            await penaltyRule.save();
        }

        res.status(200).json({ 
            success: true, 
            message: 'Penalty rule saved successfully', 
            penaltyRule 
        });
    } catch (error) {
        console.error('Error saving penalty rule:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to save penalty rule',
            error: error.message 
        });
    }
};

// Delete penalty rule (remove all slabs)
export const deletePenaltyRule = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const result = await PenaltyRule.findOneAndDelete({ shift: shiftId });

        if (!result) {
            return res.status(404).json({ success: false, message: 'Penalty rule not found' });
        }

        res.status(200).json({ success: true, message: 'Penalty rule removed successfully' });
    } catch (error) {
        console.error('Error deleting penalty rule:', error);
        res.status(500).json({ success: false, message: 'Failed to delete penalty rule' });
    }
};
