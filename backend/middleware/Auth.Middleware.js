import jwt from "jsonwebtoken";
import User from "../models/User.Model.js";

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1] || req.cookies.jwt;
        
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

        // Check account status - auto logout ex-employees
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const isAllowed = 
            user.role === 'Admin' || 
            user.status === 'Active' || 
            user.status === 'Onboarding' || 
            (user.status === 'Resigned' && (!user.exitDate || new Date(user.exitDate) >= today));

        if (!isAllowed) {
            return res.status(403).json({ success: false, message: "Account is blocked." });
        }

        req.user = user;

        next();
    } catch (error) {
        console.log("Error in verifyToken middleware", error.message);
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Unauthorized - Invalid or Expired Token" });
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const isAdmin = async (req, res, next) => {
    try {
        console.log("IsAdmin Check - Role:", req.user?.role);
        if (req.user && req.user.role === "Admin") {
            next();
        } else {
            return res.status(403).json({ success: false, message: "Access denied - Admin only" });
        }
    } catch (error) {
       console.log("Error in isAdmin middleware", error.message);
       return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export { verifyToken, isAdmin };
