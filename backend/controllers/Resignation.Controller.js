import Resignation from "../models/Resignation.Model.js";
import User from "../models/User.Model.js";
import Notification from "../models/Notification.Model.js";
import Department from "../models/Department.Model.js";

// 1. Submit Resignation (Employee)
export const submitResignation = async (req, res) => {
    try {
        const { reason, lastWorkingDay } = req.body;
        const employeeId = req.user._id;

        // Check if already submitted
        const existing = await Resignation.findOne({ employeeId, status: 'Pending' });
        if (existing) {
            return res.status(400).json({ success: false, message: "You already have a pending resignation request." });
        }

        const resignation = new Resignation({
            employeeId,
            reason,
            lastWorkingDay,
            status: 'Pending'
        });

        await resignation.save();

        // Notify Admin (logic to find admin for this user)
        const user = await User.findById(employeeId);
        if (user && user.adminId) {
            await Notification.create({
                user: user.adminId,
                title: "New Resignation Request",
                message: `${user.name} has submitted a resignation request.`,
                type: "Resignation"
            });
        }

        res.status(201).json({ success: true, message: "Resignation submitted successfully", resignation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get My Resignation Status (Employee)
export const getMyResignation = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const user = await User.findById(employeeId);
        const resignation = await Resignation.findOne({ employeeId }).sort({ createdAt: -1 });
        
        // Find notice period for this user
        let noticePeriodDays = 30;
        if (user && user.department) {
            const dept = await Department.findOne({ 
                name: user.department, 
                adminId: user.adminId 
            });
            if (dept) noticePeriodDays = dept.noticePeriodDays || 30;
        }

        res.status(200).json({ success: true, resignation, noticePeriodDays });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get All Resignations (Admin)
export const getAdminResignations = async (req, res) => {
    try {
        const { status } = req.query;
        let filter = {};
        if (status && status !== 'All') filter.status = status;

        const adminId = req.user._id;
        // Filter by adminId if not superadmin (logic depends on your app's multi-tenancy)
        const resignations = await Resignation.find(filter)
            .populate('employeeId', 'name employeeId department designation profilePhoto')
            .sort({ createdAt: -1 });


        res.status(200).json({ success: true, resignations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Action on Resignation (Admin)
export const actionResignation = async (req, res) => {
    try {
        const { resignationId, status, comments, noticePeriodDays } = req.body;
        
        const resignation = await Resignation.findById(resignationId);
        if (!resignation) return res.status(404).json({ success: false, message: "Record not found" });

        resignation.status = status;
        resignation.comments = comments;

        if (status === 'Approved') {
            let finalNoticeDays = noticePeriodDays;

            // If admin didn't provide days, fetch from department
            if (!finalNoticeDays) {
                const employee = await User.findById(resignation.employeeId);
                if (employee && employee.department) {
                    const dept = await Department.findOne({ 
                        name: employee.department, 
                        adminId: employee.adminId 
                    });
                    if (dept) finalNoticeDays = dept.noticePeriodDays;
                }
            }

            // Default to 30 if still not found
            if (!finalNoticeDays) finalNoticeDays = 30;

            resignation.noticePeriodDays = finalNoticeDays;
            
            // Calculate LWD = noticeDate + noticePeriodDays
            const lwd = new Date(resignation.noticeDate);
            lwd.setDate(lwd.getDate() + parseInt(finalNoticeDays));
            resignation.lastWorkingDay = lwd;

            // Update user profile
            await User.findByIdAndUpdate(resignation.employeeId, { 
                status: 'Resigned',
                resignationDate: resignation.noticeDate,
                exitDate: lwd 
            });
        }

        await resignation.save();

        // Notify Employee
        await Notification.create({
            user: resignation.employeeId,
            title: `Resignation ${status}`,
            message: `Your resignation request has been ${status.toLowerCase()}.`,
            type: "Resignation"
        });

        res.status(200).json({ success: true, message: `Resignation ${status.toLowerCase()} successfully`, resignation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
