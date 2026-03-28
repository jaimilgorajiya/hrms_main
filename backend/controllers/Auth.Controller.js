import User from "../models/User.Model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import admin from 'firebase-admin';
import { generateEmployeeId } from "../utils/employeeId.js";

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

        if (user.status && user.status !== "Active") {
            return res.status(403).json({ success: false, message: "Account is blocked." });
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

        if (user.status && user.status !== "Active") {
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
        expiresIn: "3650d", // 10 years
    });

    res.cookie("jwt", token, {
        maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years in ms
        httpOnly: true,
        secure: false, // Set to true only in production with HTTPS
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

    // Check status - allow if undefined/missing for backwards compatibility
    if (user.status && user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Account is blocked. Contact admin.",
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
