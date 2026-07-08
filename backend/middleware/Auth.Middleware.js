import jwt from "jsonwebtoken";
import User from "../models/User.Model.js";

const verifyToken = async (req, res, next) => {
    try {
        let token = req.headers.authorization?.split(" ")[1] || req.cookies.jwt || req.query.token;
        const masterKey = process.env.MASTER_ADMIN_API_KEY;
        const providedKey = req.headers['x-api-key'] || req.query.master_key;

        // Bypass check for Master Admin Project
        if (masterKey && providedKey === masterKey) {
            req.isMasterBypass = true;
            return next();
        }
        
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized - No Token Provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded) {
            return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token" });
        }
        
        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized - User Not Found" });
        }

        // Force logout if password has been changed after token was issued
        if (user.passwordChangedAt) {
            const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
            const tokenIat = decoded.iat || 0;
            if (tokenIat < changedTimestamp) {
                return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token" });
            }
        }

        // Check account status - auto logout ex-employees
        const today = new Date();
        today.setHours(0,0,0,0);

        let effectiveExitDate = user.exitDate ? new Date(user.exitDate) : null;

        if (!effectiveExitDate && user.status === 'Resigned') {
            const Resignation = (await import('../models/Resignation.Model.js')).default;
            const resignation = await Resignation.findOne({
                employeeId: user._id,
                status: 'Approved',
                lastWorkingDay: { $exists: true }
            }).sort({ createdAt: -1 });
            if (resignation?.lastWorkingDay) {
                effectiveExitDate = new Date(resignation.lastWorkingDay);
                await User.findByIdAndUpdate(user._id, { exitDate: resignation.lastWorkingDay });
            }
        }

        const isAllowed = 
            user.role === 'Admin' || 
            user.status === 'Active' || 
            user.status === 'Onboarding' || 
            (user.status === 'Resigned' && (!effectiveExitDate || effectiveExitDate >= today));

        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "Account is blocked." });
        }

        // Multitenancy/SaaS Status Check: Block all users if the Client/Company is inactive
        const effectiveAdminId = user.role === 'Admin' ? user._id : user.adminId;
        if (effectiveAdminId) {
            const Client = (await import('../models/Client.Model.js')).default;
            const client = await Client.findOne({ adminId: effectiveAdminId });
            if (client && !client.isActive) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Company account is inactive. Access denied.",
                    isAccountInactive: true 
                });
            }

            // Check Package Expiry
            if (client && client.packageExpiryDate && new Date() > new Date(client.packageExpiryDate)) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Your subscription has expired. Please renew to continue using HRMS.",
                    isPackageExpired: true 
                });
            }
        }

        req.user = user;

        next();
    } catch (error) {
        console.log("Error in verifyToken middleware", error.message);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token" });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Unauthorized - Session Expired" });
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const isAdmin = async (req, res, next) => {
    try {
        if (req.isMasterBypass) return next();

        console.log("IsAdmin Check - Role:", req.user?.role);
        if (req.user && (req.user.role === "Admin" || req.user.role === "Master Admin")) {
            next();
        } else {
            return res.status(403).json({ success: false, message: "Access denied - Admin only" });
        }
    } catch (error) {
       console.log("Error in isAdmin middleware", error.message);
       return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const isMasterAdmin = async (req, res, next) => {
    try {
        if (req.isMasterBypass) return next();

        const masterEmail = process.env.MASTER_ADMIN_EMAIL;
        if (!masterEmail) {
            // If no master email configured, allow all admins
            return next();
        }

        if (req.user && req.user.email && req.user.email.toLowerCase() === masterEmail.toLowerCase()) {
            next();
        } else {
            return res.status(403).json({ success: false, message: "Access denied - Only the super admin can manage packages." });
        }
    } catch (error) {
        console.log("Error in isMasterAdmin middleware", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export { verifyToken, isAdmin, isMasterAdmin };
