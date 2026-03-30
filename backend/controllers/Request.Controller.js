import Request from "../models/Request.Model.js";
import Attendance from "../models/Attendance.Model.js";
import User from "../models/User.Model.js";
import Notification from "../models/Notification.Model.js";

// POST /api/requests/submit
export const submitRequest = async (req, res) => {
    try {
        const { requestType, leaveType, date, reason, manualIn, manualOut } = req.body;
        const employeeId = req.user._id;

        // Get adminId for this employee
        const employee = await User.findById(employeeId);
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const adminId = employee.adminId || employeeId; // Fallback to self if no admin assigned (e.g. root admin)

        const newRequest = new Request({
            employee: employeeId,
            adminId,
            requestType,
            leaveType: leaveType || undefined,
            date,
            reason,
            manualIn,
            manualOut
        });

        await newRequest.save();

        res.status(201).json({ success: true, message: "Request submitted successfully", request: newRequest });
    } catch (error) {
        console.error("submitRequest error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/requests/my-requests
export const getEmployeeRequests = async (req, res) => {
    try {
        const requests = await Request.find({ employee: req.user._id }).sort({ createdAt: -1 }).populate('leaveType', 'name');
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("getEmployeeRequests error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/requests/admin/all (admin only)
export const getAdminRequests = async (req, res) => {
    try {
        const { status, requestType } = req.query;
        let filter = { adminId: req.user._id };
        if (status) filter.status = status;
        if (requestType) filter.requestType = requestType;

        const requests = await Request.find(filter)
            .populate('employee', 'name employeeId profilePhoto department designation')
            .populate('leaveType', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("getAdminRequests error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// POST /api/requests/admin/action
export const updateRequestStatus = async (req, res) => {
    try {
        const { requestId, status, adminRemark } = req.body;
        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const request = await Request.findById(requestId);
        if (!request) return res.status(404).json({ success: false, message: "Request not found" });

        request.status = status;
        request.adminRemark = adminRemark;
        request.actionDate = new Date();
        await request.save();

        if (status === "Approved") {
            if (request.requestType === "Attendance Correction") {
                // Upsert attendance record
                await Attendance.findOneAndUpdate(
                    { employee: request.employee, date: request.date },
                    {
                        $set: {
                            status: "Present",
                            approvalStatus: "Approved",
                            punches: [
                                { time: request.manualIn, type: "IN", locationAddress: "Manual Entry" },
                                { time: request.manualOut, type: "OUT", locationAddress: "Manual Entry" }
                            ]
                        }
                    },
                    { upsert: true, new: true }
                );
            } else if (request.requestType === "Leave") {
                // Upsert attendance record as On Leave
                await Attendance.findOneAndUpdate(
                    { employee: request.employee, date: request.date },
                    {
                        $set: {
                            status: "On Leave",
                            approvalStatus: "Approved",
                            punches: [] // Clear punches for leave day
                        }
                    },
                    { upsert: true, new: true }
                );
            }
        }

        // Send notification to employee
        await Notification.create({
            user: request.employee,
            title: `Request ${status}`,
            message: `Your ${request.requestType} for ${request.date} has been ${status.toLowerCase()}.`,
            type: request.requestType === "Leave" ? "Leave" : "Other"
        });

        res.status(200).json({ success: true, message: `Request ${status} successfully`, request });
    } catch (error) {
        console.error("updateRequestStatus error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
