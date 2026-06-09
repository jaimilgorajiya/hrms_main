import PenaltyRule from '../models/PenaltyRule.Model.js';
import Shift from '../models/Shift.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';

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
export const calculatePenaltyAmount = async (shiftId, penaltyMins, employeeId = null, existingRule = null, lateCount = null, penaltyType = 'Late In Minutes') => {
    try {
        const cleanMins = Math.floor(penaltyMins);
        const searchId = shiftId?._id || shiftId;

        console.log(`[PENALTY_DEBUG] Fetching ${penaltyType} rule for shift: ${searchId}`);
        const rule = existingRule || await PenaltyRule.findOne({ shift: searchId });
        
        if (!rule) {
            console.log(`[PENALTY_DEBUG] No rule record found in database for shift ${searchId}`);
            return 0;
        }

        if (!rule.slabs || rule.slabs.length === 0) {
            console.log(`[PENALTY_DEBUG] Rule found, but slabs are empty for shift ${searchId}`);
            return 0;
        }

        const typeSlabs = rule.slabs.filter(s => s.penaltyType === penaltyType);
        console.log(`[PENALTY_DEBUG] Checking ${typeSlabs.length} '${penaltyType}' slabs for ${cleanMins}m.`);

        const matchingSlab = typeSlabs.find(s => cleanMins >= s.minTime && (cleanMins <= s.maxTime || !s.maxTime));
        
        if (!matchingSlab) {
            console.log(`[PENALTY_DEBUG] No matching slab found in range for ${cleanMins}m.`);
            return 0;
        }

        // Grace count check (only for Late In Minutes usually, but keeps code robust)
        const graceCount = matchingSlab.grace_count || 0;
        if (graceCount > 0 && employeeId && penaltyType === 'Late In Minutes') {
            let lateThisMonth = lateCount;
            if (lateThisMonth === null) {
                const Attendance = (await import('../models/Attendance.Model.js')).default;
                const monthStart = new Date();
                monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
                const monthStartStr = monthStart.toISOString().split('T')[0];

                lateThisMonth = await Attendance.countDocuments({
                    employee: employeeId,
                    date: { $gte: monthStartStr },
                    'lateInPenalty.isLate': true
                });
            }

            console.log(`[PENALTY_DEBUG] Grace count: ${graceCount}, Late entries this month: ${lateThisMonth}`);

            if (lateThisMonth < graceCount) {
                console.log(`[PENALTY_DEBUG] Within grace period. No penalty applied.`);
                return 0;
            }
        }

        console.log(`[PENALTY_DEBUG] Match Found! Slab: ${matchingSlab.minTime}-${matchingSlab.maxTime}, Value: ${matchingSlab.value}, Type: ${matchingSlab.type}`);

        let dailySalary = 0;
        if (employeeId) {
            const ctc = await EmployeeCTC.findOne({ employeeId });
            if (ctc) {
                const monthlyGross = ctc.monthlyGross || 0;
                dailySalary = monthlyGross / 30; // Standard fallback of 30 days
                console.log(`[PENALTY_DEBUG] Employee monthlyGross: ${monthlyGross}, dailySalary: ${dailySalary}`);
            } else {
                console.log(`[PENALTY_DEBUG] No EmployeeCTC found for employee: ${employeeId}`);
            }
        } else {
            console.log(`[PENALTY_DEBUG] No employeeId provided, dailySalary defaulted to 0`);
        }

        let amount = 0;
        switch (matchingSlab.type) {
            case 'Flat':
                amount = matchingSlab.value || 0;
                break;
            case 'Percentage':
                amount = (dailySalary * (matchingSlab.value || 0)) / 100;
                break;
            case 'Per Minute (Flat Amount)':
                amount = cleanMins * (matchingSlab.value || 0);
                break;
            case 'Per Minute (As Per Salary)':
                // dailySalary divided by 480 minutes (8 hours) to get per-minute rate, multiplied by matchingSlab.value
                amount = cleanMins * (dailySalary / 480) * (matchingSlab.value || 1);
                break;
            case 'Half Day Salary':
                amount = dailySalary * 0.5 * (matchingSlab.value || 1);
                break;
            case 'Full Day Salary':
                amount = dailySalary * (matchingSlab.value || 1);
                break;
            default:
                amount = matchingSlab.value || 0;
                break;
        }

        const finalAmount = parseFloat(amount.toFixed(2));
        console.log(`[PENALTY_DEBUG] Calculated penalty amount: ${finalAmount} (Type: ${matchingSlab.type})`);
        return finalAmount;
    } catch (error) {
        console.error("[PENALTY_DEBUG] Calculation Error:", error);
        return 0;
    }
};
