import User from "../models/User.Model.js";
import Department from "../models/Department.Model.js";
import Designation from "../models/Designation.Model.js";
import Onboarding from "../models/Onboarding.Model.js";
import Offboarding from "../models/Offboarding.Model.js";
import Request from "../models/Request.Model.js";
import Attendance from "../models/Attendance.Model.js";

const getTodayStr = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    return ist.toISOString().split('T')[0];
};

export const getAdminStats = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Basic Stats
        const adminFilter = {
            role: { $ne: 'Admin' },
            adminId
        };

        const totalUsers = await User.countDocuments(adminFilter);
        const activeEmployees = await User.find({ ...adminFilter, status: { $in: ['Active', 'Resigned'] } }).select('_id');
        const activeEmpIds = activeEmployees.map(e => e._id);
        const activeUsersCount = activeEmpIds.length;

        // Attendance Stats for Today
        const todayStr = getTodayStr();
        const presentToday = await Attendance.countDocuments({ adminId, date: todayStr, status: { $in: ['Present', 'Clocked In'] }, employee: { $in: activeEmpIds } });
        const halfDayToday = await Attendance.countDocuments({ adminId, date: todayStr, status: { $in: ['Half Day', 'HALF DAY'] }, employee: { $in: activeEmpIds } });
        const onLeaveToday = await Attendance.countDocuments({ adminId, date: todayStr, status: 'On Leave', employee: { $in: activeEmpIds } });
        const totalAttendanceToday = await Attendance.countDocuments({ adminId, date: todayStr, employee: { $in: activeEmpIds } });
        const absentToday = Math.max(0, activeUsersCount - totalAttendanceToday);

        const totalDepartments = await Department.countDocuments({ adminId });
        const totalDesignations = await Designation.countDocuments({ adminId });
        const activeOnboarding = await User.countDocuments({
            ...adminFilter,
            status: 'Onboarding'
        });
        const activeOffboarding = await Offboarding.countDocuments({ status: { $ne: 'Completed' }, adminId });

        // Request Stats
        const pendingLeaveRequests = await Request.countDocuments({
            adminId,
            requestType: 'Leave',
            status: 'Pending'
        });
        const pendingAttendanceRequests = await Request.countDocuments({
            adminId,
            requestType: 'Attendance Correction',
            status: 'Pending'
        });

        // Department Distribution
        const departmentStats = await User.aggregate([
            {
                $match: {
                    role: { $ne: 'Admin' },
                    adminId
                }
            },
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $project: { name: "$_id", count: 1 } }
        ]);

        // Role Distribution
        const roleStats = await User.aggregate([
            {
                $match: {
                    adminId
                }
            },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Gender Distribution
        const genderStats = await User.aggregate([
            {
                $match: {
                    role: { $ne: 'Admin' },
                    adminId
                }
            },
            { $group: { _id: "$gender", count: { $sum: 1 } } }
        ]);

        // Recent Users
        const recentUsers = await User.find(adminFilter)
            .select("name email role status department createdAt")
            .sort({ createdAt: -1 })
            .limit(5);

        // 7-day trend calculations
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
            last7Days.push(istDate.toISOString().split('T')[0]);
        }

        const attendanceRecords = await Attendance.find({
            adminId,
            date: { $in: last7Days },
            employee: { $in: activeEmpIds }
        });

        const usersList = await User.find({
            adminId,
            role: { $ne: 'Admin' }
        }).select('createdAt');

        const workforceTrend = [];
        const presentTrend = [];
        const absentTrend = [];
        const onLeaveTrend = [];

        last7Days.forEach(dateStr => {
            const dayEnd = new Date(dateStr + 'T23:59:59.999Z');
            const workforceCount = usersList.filter(u => new Date(u.createdAt) <= dayEnd).length;
            
            const recordsForDay = attendanceRecords.filter(r => r.date === dateStr);
            const present = recordsForDay.filter(r => ['Present', 'Clocked In'].includes(r.status)).length;
            const halfDay = recordsForDay.filter(r => ['Half Day', 'HALF DAY'].includes(r.status)).length;
            const onLeave = recordsForDay.filter(r => r.status === 'On Leave').length;
            const totalAttendance = recordsForDay.length;

            const absent = Math.max(0, workforceCount - totalAttendance);

            workforceTrend.push({ v: workforceCount });
            presentTrend.push({ v: present + halfDay });
            absentTrend.push({ v: absent });
            onLeaveTrend.push({ v: onLeave });
        });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                activeUsers: activeUsersCount,
                presentToday,
                halfDayToday,
                onLeaveToday,
                absentToday,
                totalDepartments,
                totalDesignations,
                activeOnboarding,
                activeOffboarding,
                pendingLeaveRequests,
                pendingAttendanceRequests
            },
            trends: {
                workforce: workforceTrend,
                present: presentTrend,
                absent: absentTrend,
                onLeave: onLeaveTrend
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