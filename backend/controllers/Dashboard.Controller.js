import User from "../models/User.Model.js";
import Department from "../models/Department.Model.js";
import Designation from "../models/Designation.Model.js";
import Onboarding from "../models/Onboarding.Model.js";
import Offboarding from "../models/Offboarding.Model.js";

export const getAdminStats = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Basic Stats
        const adminFilter = { 
            role: { $ne: 'Admin' }, 
            $or: [{ adminId }, { adminId: { $exists: false } }] 
        };

        const totalUsers = await User.countDocuments(adminFilter); 
        const activeUsers = await User.countDocuments({ ...adminFilter, status: 'Active' });
        const totalDepartments = await Department.countDocuments({ adminId });
        const totalDesignations = await Designation.countDocuments({ adminId });
        const activeOnboarding = await User.countDocuments({ 
            ...adminFilter, 
            status: 'Onboarding' 
        });
        const activeOffboarding = await Offboarding.countDocuments({ status: { $ne: 'Completed' }, adminId });

        // Department Distribution
        const departmentStats = await User.aggregate([
            { 
                $match: { 
                    role: { $ne: 'Admin' }, 
                    department: { $exists: true, $ne: null, $ne: '' },
                    $or: [{ adminId }, { adminId: { $exists: false } }]
                } 
            },
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $project: { name: "$_id", count: 1 } }
        ]);
    
        // Role Distribution
        const roleStats = await User.aggregate([
            { 
                $match: { 
                    role: { $ne: 'Admin' },
                    $or: [{ adminId }, { adminId: { $exists: false } }]
                } 
            },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
    
        // Gender Distribution
        const genderStats = await User.aggregate([
            { 
                $match: { 
                    role: { $ne: 'Admin' }, 
                    gender: { $exists: true, $ne: null },
                    $or: [{ adminId }, { adminId: { $exists: false } }]
                } 
            },
            { $group: { _id: "$gender", count: { $sum: 1 } } }
        ]);
    
        // Recent Users
        const recentUsers = await User.find(adminFilter)
            .select("name email role status department createdAt")
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalDepartments,
                totalDesignations,
                activeOnboarding,
                activeOffboarding
            },
            departmentStats,
            roleStats,
            genderStats,
            recentUsers
        });
    } catch (error) {
        console.error("Error in getAdminStats:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
        }
};