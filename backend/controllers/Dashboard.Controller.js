import User from "../models/User.Model.js";
import Department from "../models/Department.Model.js";
import Designation from "../models/Designation.Model.js";
import Onboarding from "../models/Onboarding.Model.js";
import Offboarding from "../models/Offboarding.Model.js";
import Request from "../models/Request.Model.js";
import Attendance from "../models/Attendance.Model.js";
import SalaryGroup from "../models/SalaryGroup.Model.js";
import { computeWorkingMinutes } from "../utils/attendance.js";

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
            adminId,
            status: { $nin: ['Ex-Employee', 'Resigned', 'Terminated', 'Absconding', 'Retired'] }
        };

        const totalUsers = await User.countDocuments(adminFilter);
        const activeEmployees = await User.find({ ...adminFilter, status: 'Active' }).select('_id');
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

export const getEmployeePerformance = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Fetch all active employees under this admin
        const employees = await User.find({
            adminId,
            role: { $ne: 'Admin' },
            status: { $nin: ['Ex-Employee', 'Resigned', 'Terminated', 'Absconding', 'Retired'] }
        }).populate('workSetup.shift').populate('workSetup.salaryGroup');

        const performanceList = [];
        const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        const parseTime = (timeStr) => {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        for (const emp of employees) {
            const shift = emp.workSetup?.shift || null;
            const salaryGroup = emp.workSetup?.salaryGroup || null;
            const cycleStartDay = salaryGroup?.salaryCycleStartDate || 1;

            let cycleStart = new Date(istNow);
            cycleStart.setUTCHours(0,0,0,0);
            if (istNow.getUTCDate() < cycleStartDay) {
                cycleStart.setUTCMonth(cycleStart.getUTCMonth() - 1);
            }
            cycleStart.setUTCDate(cycleStartDay);

            const cycleEnd = new Date(cycleStart);
            cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + 1);
            cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1);
            cycleEnd.setUTCHours(23,59,59,999);

            // Fetch attendance for the current cycle
            const monthAttendance = await Attendance.find({
                employee: emp._id,
                date: { $gte: cycleStart.toISOString().split('T')[0] }
            });

            // Calculate actual working hours
            let monthWorkMins = 0;
            for (const a of monthAttendance) {
                monthWorkMins += computeWorkingMinutes(a.punches, a.breaks);
            }
            const actualHours = Math.floor(monthWorkMins / 60);

            // Calculate expected hours for the full cycle
            let expectedHoursTotal = 0;
            if (shift) {
                const woDays = shift.weekOffDays || [];
                const joiningDate = emp.dateJoined ? new Date(emp.dateJoined) : null;

                let effectiveStart = new Date(cycleStart);
                if (joiningDate && joiningDate > effectiveStart) {
                    effectiveStart = new Date(joiningDate);
                    effectiveStart.setUTCHours(0,0,0,0);
                }

                let expectedMinsTotal = 0;
                let curr = new Date(effectiveStart);
                while (curr <= cycleEnd) {
                    const dayIndex = curr.getUTCDay();
                    const dayName = daysOfWeek[dayIndex];
                    const isWO = woDays.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                    if (!isWO) {
                        const daySchedule = shift.schedule?.[dayName];
                        const dayStart = daySchedule?.shiftStart;
                        const dayEnd = daySchedule?.shiftEnd;

                        if (dayStart && dayEnd) {
                            let diff = parseTime(dayEnd) - parseTime(dayStart);
                            if (diff < 0) diff += 24 * 60; // Overnight
                            
                            let breakMins = 0;
                            if (daySchedule.lunchStart && daySchedule.lunchEnd) {
                                const d = parseTime(daySchedule.lunchEnd) - parseTime(daySchedule.lunchStart);
                                if (d > 0) breakMins += d;
                            }
                            if (daySchedule.teaStart && daySchedule.teaEnd) {
                                const d = parseTime(daySchedule.teaEnd) - parseTime(daySchedule.teaStart);
                                if (d > 0) breakMins += d;
                            }
                            diff = Math.max(0, diff - breakMins);
                            expectedMinsTotal += diff;
                        } else {
                            expectedMinsTotal += 8 * 60;
                        }
                    }
                    curr.setUTCDate(curr.getUTCDate() + 1);
                }
                expectedHoursTotal = Math.round(expectedMinsTotal / 60);
            }

            const productivity = expectedHoursTotal > 0 ? Math.round((actualHours / expectedHoursTotal) * 100) : 0;

            performanceList.push({
                _id: emp._id,
                name: emp.name,
                profilePhoto: emp.profilePhoto,
                department: emp.department || 'General',
                designation: emp.designation || 'Employee',
                actualHours,
                expectedHours: expectedHoursTotal,
                productivity
            });
        }

        // Sort by productivity descending
        performanceList.sort((a, b) => b.productivity - a.productivity);

        res.status(200).json({
            success: true,
            performance: performanceList
        });
    } catch (error) {
        console.error("Error in getEmployeePerformance:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};