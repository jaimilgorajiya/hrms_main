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
export const calculatePenaltyAmount = async (shiftId, lateByMins, employeeId = null) => {
    try {
        const cleanLateMins = Math.floor(lateByMins);
        const searchId = shiftId?._id || shiftId;

        console.log(`[PENALTY_DEBUG] Fetching rule for shift: ${searchId}`);
        const rule = await PenaltyRule.findOne({ shift: searchId });
        
        if (!rule) {
            console.log(`[PENALTY_DEBUG] No rule record found in database for shift ${searchId}`);
            return 0;
        }

        if (!rule.slabs || rule.slabs.length === 0) {
            console.log(`[PENALTY_DEBUG] Rule found, but slabs are empty for shift ${searchId}`);
            return 0;
        }

        const lateSlabs = rule.slabs.filter(s => s.penaltyType === 'Late In Minutes');
        console.log(`[PENALTY_DEBUG] Checking ${lateSlabs.length} 'Late In Minutes' slabs for ${cleanLateMins}m lateness.`);

        const matchingSlab = lateSlabs.find(s => cleanLateMins >= s.minTime && (cleanLateMins <= s.maxTime || !s.maxTime));
        
        if (!matchingSlab) {
            console.log(`[PENALTY_DEBUG] No matching slab found in range for ${cleanLateMins}m.`);
            return 0;
        }

        // Grace count check — skip penalty if employee hasn't exceeded allowed late entries this month
        const graceCount = matchingSlab.grace_count || 0;
        if (graceCount > 0 && employeeId) {
            const Attendance = (await import('../models/Attendance.Model.js')).default;
            const monthStart = new Date();
            monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
            const monthStartStr = monthStart.toISOString().split('T')[0];

            const lateThisMonth = await Attendance.countDocuments({
                employee: employeeId,
                date: { $gte: monthStartStr },
                'lateInPenalty.isLate': true
            });

            console.log(`[PENALTY_DEBUG] Grace count: ${graceCount}, Late entries this month (with penalty): ${lateThisMonth}`);

            if (lateThisMonth < graceCount) {
                console.log(`[PENALTY_DEBUG] Within grace period. No penalty applied.`);
                return 0;
            }
        }

        console.log(`[PENALTY_DEBUG] Match Found! Slab: ${matchingSlab.minTime}-${matchingSlab.maxTime}, Value: ${matchingSlab.value}, Type: ${matchingSlab.type}`);

        switch (matchingSlab.type) {
            case 'Flat':
                return matchingSlab.value;
            case 'Per Minute (Flat Amount)':
                return cleanLateMins * matchingSlab.value;
            default:
                return matchingSlab.value;
        }
    } catch (error) {
        console.error("[PENALTY_DEBUG] Calculation Error:", error);
        return 0;
    }
};
