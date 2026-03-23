import User from "../models/User.Model.js";
import Department from "../models/Department.Model.js";
import Designation from "../models/Designation.Model.js";
import Onboarding from "../models/Onboarding.Model.js";
import Offboarding from "../models/Offboarding.Model.js";

export const getAdminStats = async (req, res) => {
    try {
        // Basic Stats
        const totalUsers = await User.countDocuments({ role: { $ne: 'Admin' } }); 
        const activeUsers = await User.countDocuments({ status: 'Active', role: { $ne: 'Admin' } });
        const totalDepartments = await Department.countDocuments();
        const totalDesignations = await Designation.countDocuments();
        const activeOnboarding = await User.countDocuments({ status: 'Onboarding' });
        const activeOffboarding = await Offboarding.countDocuments({ status: { $ne: 'Completed' } });

        // Department Distribution (Assuming department is stored as string/name in User model)
        const departmentStats = await User.aggregate([
            { $match: { role: { $ne: 'Admin' }, department: { $exists: true, $ne: null, $ne: '' } } },
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $project: { name: "$_id", count: 1 } }
        ]);
    
        // Role Distribution
        const roleStats = await User.aggregate([
            { $match: { role: { $ne: 'Admin' } } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
    
        // Gender Distribution
        const genderStats = await User.aggregate([
            { $match: { role: { $ne: 'Admin' }, gender: { $exists: true, $ne: null } } },
            { $group: { _id: "$gender", count: { $sum: 1 } } }
        ]);
    
        // Recent Users
        const recentUsers = await User.find({ role: { $ne: 'Admin' } })
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