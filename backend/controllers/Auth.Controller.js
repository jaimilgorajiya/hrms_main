import User from "../models/User.Model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import admin from 'firebase-admin';
import { generateEmployeeId } from "../utils/employeeId.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

const otpLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: "ID Token is required" });
        }

        // Verify Firebase Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const phoneNumber = decodedToken.phone_number;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: "Phone number not found in token" });
        }

        // Find user by phone (handle multiple potential phone fields if necessary)
        // Usually, we store it in user.phone
        // We might need to handle the "+" prefix from Firebase
        const cleanPhone = phoneNumber.replace('+', '');
        
        const user = await User.findOne({ 
            $or: [
                { phone: phoneNumber },
                { phone: cleanPhone },
                { phone: phoneNumber.slice(-10) } // Last 10 digits
            ]
        }).populate("managementRole");

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "No employee found with this phone number. Please contact admin." 
            });
        }

        // Check account status
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const isAllowed = 
            user.role === 'Admin' || 
            user.status === 'Active' || 
            user.status === 'Onboarding' || 
            (user.status === 'Resigned' && (!user.exitDate || new Date(user.exitDate) >= today));

        if (!isAllowed) {
            return res.status(403).json({ 
                success: false, 
                message: "This account is inactive or has been blocked. Please contact HR." 
            });
        }

        // Generate JWT
        const token = generateTokenAndSetCookie(user._id, res);

        // Update Online status
        await User.findByIdAndUpdate(user._id, { isOnline: true });

        res.status(200).json({
            success: true,
            message: "OTP Login successful",
            user: {
                token: token,
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                managementRole: user.managementRole || null,
            },
        });

    } catch (error) {
        console.error("OTP Login Error:", error.message);
        res.status(401).json({ success: false, message: "Invalid or expired session. Please try again." });
    }
};

const checkPhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        // Clean phone for lookup (remove +91 if present for searching variations)
        const cleanPhone = phone.replace(/^\+91/, '').replace(/^\+/, '');
        
        const user = await User.findOne({ 
            $or: [
                { phone: phone },
                { phone: cleanPhone },
                { phone: phone.startsWith('+') ? phone : `+91${phone}` },
                { phone: cleanPhone.slice(-10) }
            ]
        });

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "This mobile number is not registered. Please contact your HR/Admin." 
            });
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        // Check resignation last working day — also look up Resignation record as fallback
        // in case exitDate wasn't synced to the User document
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
                // Sync it back to the user record so future checks are fast
                await User.findByIdAndUpdate(user._id, { exitDate: resignation.lastWorkingDay });
            }
        }

        const isBlocked = 
            (user.status && !["Active", "Onboarding", "Resigned"].includes(user.status)) ||
            (user.status === "Resigned" && effectiveExitDate && effectiveExitDate < today);

        if (isBlocked) {
            return res.status(403).json({ success: false, message: "Account is blocked. Contact admin." });
        }

        res.status(200).json({ success: true, message: "User verified" });

    } catch (error) {
        console.error("Check Phone Error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const generateTokenAndSetCookie = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "30d", // 30 days
    });

    res.cookie("jwt", token, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax",
        path: "/",
    });
    return token;
}
    
const register = async (req, res) => {
    try {
        let { name, email, password, role } = req.body;
        
        // Trim inputs
        email = email.trim().toLowerCase();
        name = name.trim();
        
        // Only Admin can register from the frontend
        if (role && role !== "Admin") {
            return res.status(403).json({ 
                success: false, 
                message: "Only Admin accounts can be registered through this portal." 
            });
        }

        const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

        if (user) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate employee ID automatically
        const employeeId = await generateEmployeeId();

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: "Admin", // Force role to Admin
            status: "Active", // Explicitly set status to Active
            employeeId
        });

        if (newUser) {
            const token = generateTokenAndSetCookie(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                success: true,
                message: "Admin account created successfully",
                user: {
                    id: newUser._id,
                    _id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    status: newUser.status,
                    token
                }
            });
        }
        else {
            res.status(400).json({ success: false, message: "Invalid user data" });
        }

    } catch (error) {
        console.log("Error in register controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });

    }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    email = email.trim().toLowerCase();

    // Find user - using case-insensitive search to be safe for existing data
    // Populate managementRole so frontend immediately knows permissions
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } })
      .populate("managementRole");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check account status
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const isAllowed = 
        user.role === 'Admin' || 
        user.role === 'Manager' || // Managers are allowed on web
        user.status === 'Active' || 
        user.status === 'Onboarding' || 
        (user.status === 'Resigned' && (!user.exitDate || new Date(user.exitDate) >= today));

    if (!isAllowed) {
        return res.status(403).json({ 
            success: false, 
            message: "Account is blocked. Contact administrator." 
        });
    }

    // Role-based web restriction
    if (user.role === 'Employee') {
        return res.status(403).json({
            success: false,
            message: "Employees can only access the HRMS via the Mobile App."
        });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }



    // Generate JWT Cookie
    const token = generateTokenAndSetCookie(user._id, res);

    // Update Online status
    await User.findByIdAndUpdate(user._id, { isOnline: true });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        token: token,
        id: user._id,
        _id: user._id, // Keep for compatibility
        name: user.name,
        email: user.email,
        role: user.role,
        managementRole: user.managementRole || null,
      },
    });

  } catch (error) {
    console.error("Login Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const logout = async (req, res) => {
    try {
        res.cookie("jwt", "", {
            httpOnly: true,
            secure: false, // Match the setting in generateToken
            sameSite: "lax",
            expires: new Date(0),
            path: "/",
        });

        // Update Online status
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, { isOnline: false });
        }

        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const verifyUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password")
            .populate("managementRole");
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user ? req.user._id : null;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new passwords are required" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: "New password cannot be the same as the current password" });
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Compare current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid current password" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password using findByIdAndUpdate to target only the password field
        // This avoids validation errors on other unrelated fields like workSetup.shift
        
        // Sanitize the shift field if it's an empty string to prevent future validation errors
        if (user.workSetup && user.workSetup.shift === "") {
            await User.findByIdAndUpdate(userId, { 
                $set: { password: hashedPassword },
                $unset: { "workSetup.shift": "" } 
            });
        } else {
            await User.findByIdAndUpdate(userId, { 
                $set: { password: hashedPassword } 
            });
        }

        res.status(200).json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export { register, login, otpLogin, logout, verifyUser, changePassword, checkPhone };

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        // Always return success to prevent email enumeration
        if (!user) return res.status(404).json({ success: false, message: 'No account found with this email address.' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await User.findByIdAndUpdate(user._id, {
            $set: { resetPasswordToken: token, resetPasswordExpiry: expiry }
        });

        await sendPasswordResetEmail(user.email, user.name || user.firstName || 'User', token);

        res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('forgotPassword error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password are required' });
        if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: new Date() }
        });

        if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });

        const hashed = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(user._id, {
            $set: { password: hashed },
            $unset: { resetPasswordToken: '', resetPasswordExpiry: '' }
        });

        res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error('resetPassword error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
