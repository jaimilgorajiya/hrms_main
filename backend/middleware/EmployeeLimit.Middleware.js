import User from '../models/User.Model.js';
import Client from '../models/Client.Model.js';

/**
 * Middleware to check if the admin has reached their employee limit
 * based on their active package subscription + any addon purchases.
 * Runs before createUser to prevent exceeding the allowed employee count.
 */
export const checkEmployeeLimit = async (req, res, next) => {
    try {
        // Skip check for Master Admin bypass (via API key)
        if (req.isMasterBypass) return next();

        // Skip check if the user is the master admin (via email or role)
        const masterEmail = process.env.MASTER_ADMIN_EMAIL;
        const isMaster = (masterEmail && req.user.email && req.user.email.toLowerCase() === masterEmail.toLowerCase()) || req.user.role === 'Master Admin';
        if (isMaster) {
            return next();
        }

        const adminId = req.user._id;

        // Get client record for this admin
        const client = await Client.findOne({ adminId }).populate('packageId');
        if (!client) {
            // No client record means legacy account — allow freely
            return next();
        }

        // Calculate total allowed employees
        const baseLimit = client.packageId?.maxEmployees || client.maxEmployees || 0;
        const addonTotal = (client.addonPurchases || [])
            .reduce((sum, addon) => sum + (addon.employeesAdded || 0), 0);
        const totalAllowed = baseLimit + addonTotal;

        // Count current active employees under this admin
        const currentCount = await User.countDocuments({
            adminId,
            role: { $ne: 'Admin' },
            status: { $in: ['Active', 'Onboarding', 'Resigned'] }
        });

        if (currentCount >= totalAllowed) {
            return res.status(403).json({
                success: false,
                message: `Employee limit reached (${currentCount}/${totalAllowed}). Please purchase an employee add-on pack to add more employees.`,
                limitReached: true,
                currentCount,
                maxAllowed: totalAllowed
            });
        }

        // Attach usage info to request for potential use in response
        req.employeeUsage = { currentCount, maxAllowed: totalAllowed };
        next();
    } catch (error) {
        console.error('Employee limit check error:', error);
        // Don't block on errors — allow the request to proceed
        next();
    }
};
