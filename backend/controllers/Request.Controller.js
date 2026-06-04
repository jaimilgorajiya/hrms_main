import Request from "../models/Request.Model.js";
import Attendance from "../models/Attendance.Model.js";
import User from "../models/User.Model.js";
import Notification from "../models/Notification.Model.js";
import LeaveType from "../models/LeaveType.Model.js";
import LeaveGroup from "../models/LeaveGroup.Model.js";
import { isMonthLocked } from "../utils/payoutLock.js";

// POST /api/requests/submit
export const submitRequest = async (req, res) => {
    try {
        const { requestType, leaveType, date, reason, manualIn, manualOut, workSummary, leaveDuration, fromDate, toDate, leaveCategory } = req.body;
        const employeeId = req.user._id;

        // Check if month is locked (month-end lock feature)
        const checkStart = fromDate || date;
        const checkEnd = toDate || date;
        if (checkStart) {
            if (await isMonthLocked(employeeId, checkStart, checkEnd)) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Attendance/Leave for this month has been locked and cannot be modified." 
                });
            }
        }

        // Get adminId for this employee
        const employee = await User.findById(employeeId).populate('leaveGroup');
        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        const adminId = employee.adminId || employeeId; // Fallback to self if no admin assigned (e.g. root admin)

        // ── POLICY ENFORCEMENT ──
        if (requestType === 'Leave') {
            const startStr = fromDate || date;
            const endStr = toDate || date;

            // 0. Prevent Duplicate/Overlapping Leave Requests
            const existingOverlap = await Request.findOne({
                employee: employeeId,
                requestType: 'Leave',
                status: { $ne: 'Rejected' },
                $or: [
                    { fromDate: { $lte: endStr }, toDate: { $gte: startStr } }
                ]
            });

            if (existingOverlap) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Conflict: You already have a ${existingOverlap.status.toLowerCase()} leave request for these dates (${existingOverlap.fromDate} to ${existingOverlap.toDate}).` 
                });
            }

            const lt = await LeaveType.findById(leaveType);
            if (!lt) return res.status(404).json({ success: false, message: "Invalid leave type" });

            // 1. Gender Restriction
            if (lt.applicableFor === 'Male Only' && employee.gender !== 'Male') return res.status(400).json({ success: false, message: "This leave type is only for Male employees." });
            if (lt.applicableFor === 'Female Only' && employee.gender !== 'Female') return res.status(400).json({ success: false, message: "This leave type is only for Female employees." });

            // 2. Back-dated Restriction
            const todayStr = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
            if (lt.applyOnPastDays === 'No' && startStr < todayStr) {
                return res.status(400).json({ success: false, message: "Back-dated leave is restricted for this leave type." });
            }

            // 3. Paid Leave Balance and Monthly Limit Check
            if (leaveCategory === 'Paid') {
                const leaveGroup = employee.leaveGroup;
                const entitlement = Number(employee.noOfPaidLeaves || leaveGroup?.noOfPaidLeaves || 0);

                // Calculate requested days for the current request
                const reqStart = new Date(startStr);
                const reqEnd = new Date(endStr);
                const reqDiffDays = Math.ceil(Math.abs(reqEnd - reqStart) / (1000 * 60 * 60 * 24)) + 1;
                const requestedDays = leaveDuration === "Full Day" ? reqDiffDays : 0.5;

                // Calculate total used/pending paid leaves so far (excluding Rejected status)
                const allApprovedRequests = await Request.find({
                    employee: employeeId,
                    requestType: 'Leave',
                    status: { $ne: 'Rejected' },
                    leaveCategory: 'Paid'
                });

                let totalUsed = 0;
                allApprovedRequests.forEach(r => {
                    const start = new Date(r.fromDate);
                    const end = new Date(r.toDate);
                    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                    totalUsed += (r.leaveDuration === "Full Day" ? diffDays : 0.5);
                });

                const remainingBalance = entitlement - totalUsed;
                if (requestedDays > remainingBalance) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient Paid Leave balance: You have only ${remainingBalance.toFixed(2)} days remaining, but requested ${requestedDays} days.`
                    });
                }

                // Enforce monthly limit check
                const maxInMonth = (employee.maxPLMonth && employee.maxPLMonth > 0) 
                    ? employee.maxPLMonth 
                    : (leaveGroup?.maxUseInMonth || 0);

                if (maxInMonth > 0) {
                    // Calculate current month's used paid leave days
                    const monthStart = startStr.substring(0, 7) + "-01";
                    const monthEnd = startStr.substring(0, 7) + "-31";
                    
                    const approvedRequests = await Request.find({
                        employee: employeeId,
                        requestType: 'Leave',
                        status: { $ne: 'Rejected' },
                        leaveCategory: 'Paid',
                        fromDate: { $gte: monthStart, $lte: monthEnd }
                    });

                    let usedInMonth = 0;
                    approvedRequests.forEach(req => {
                        const start = new Date(req.fromDate);
                        const end = new Date(req.toDate);
                        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                        usedInMonth += (req.leaveDuration === "Full Day" ? diffDays : 0.5);
                    });

                    if ((usedInMonth + requestedDays) > maxInMonth) {
                        return res.status(400).json({ 
                            success: false, 
                            message: `Monthly Paid Leave Limit Reached: You have already used ${usedInMonth} out of ${maxInMonth} allowed paid leave days for this month.` 
                        });
                    }
                }
            }
        }

        const newRequest = new Request({
            employee: employeeId,
            adminId,
            requestType,
            leaveType: leaveType || undefined,
            leaveDuration: leaveDuration || "Full Day",
            leaveCategory: leaveCategory || "Paid",
            fromDate: fromDate || date,
            toDate: toDate || date,
            date: date || fromDate, // Fallback for old records
            reason,
            manualIn,
            manualOut,
            workSummary
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
        const todayStr = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const allRequests = await Request.find({ employee: req.user._id }).sort({ createdAt: -1 }).populate('leaveType', 'name');
        
        // Hide 'Attendance Correction' for Today
        const requests = allRequests.filter(r => {
            if (r.requestType === 'Attendance Correction' && r.date === todayStr) return false;
            return true;
        });

        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error("getEmployeeRequests error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/requests/admin/all (admin only)
export const getAdminRequests = async (req, res) => {
    try {
        const { status, requestType, employee, startDate, endDate } = req.query;
        let filter = { adminId: req.user._id };
        
        if (status && status !== 'All') filter.status = status;
        if (requestType && requestType !== 'All') filter.requestType = requestType;
        if (employee) filter.employee = employee;

        if (startDate && endDate) {
            filter.$or = [
                { fromDate: { $lte: endDate }, toDate: { $gte: startDate } },
                { date: { $gte: startDate, $lte: endDate } }
            ];
        } else if (startDate) {
            filter.$or = [
                { fromDate: { $gte: startDate } },
                { toDate: { $gte: startDate } },
                { date: { $gte: startDate } }
            ];
        } else if (endDate) {
            filter.$or = [
                { fromDate: { $lte: endDate } },
                { toDate: { $lte: endDate } },
                { date: { $lte: endDate } }
            ];
        }

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

        // Check if month is locked (month-end lock feature)
        const checkStart = request.fromDate || request.date;
        const checkEnd = request.toDate || request.date;
        if (checkStart) {
            if (await isMonthLocked(request.employee, checkStart, checkEnd)) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Attendance/Leave for this month has been locked and cannot be modified." 
                });
            }
        }

        request.status = status;
        request.adminRemark = adminRemark;
        request.actionDate = new Date();
        await request.save();

        if (status === "Approved") {
            if (request.requestType === "Attendance Correction") {
                // Find existing record
                const existing = await Attendance.findOne({ employee: request.employee, date: request.date });
                
                if (existing && existing.punches.length > 0 && !existing.punches.some(p => p.type === 'OUT')) {
                    // It's a ghost punch correction: just append the OUT
                    await Attendance.findOneAndUpdate(
                        { _id: existing._id },
                        {
                            $set: { status: "Present", approvalStatus: "Approved", adminId: request.adminId },
                            $push: {
                                punches: { 
                                    time: request.manualOut, 
                                    type: "OUT", 
                                    locationAddress: "Manual Entry (Correction)", 
                                    workSummary: request.workSummary || "Missed Punch Correction" 
                                }
                            }
                        }
                    );
                } else {
                    // No existing record or already has OUT: replace/set fully
                    await Attendance.findOneAndUpdate(
                        { employee: request.employee, date: request.date },
                        {
                            $set: {
                                adminId: request.adminId,
                                status: "Present",
                                approvalStatus: "Approved",
                                punches: [
                                    { time: request.manualIn, type: "IN", locationAddress: "Manual Entry" },
                                    { time: request.manualOut, type: "OUT", locationAddress: "Manual Entry", workSummary: request.workSummary }
                                ]
                            }
                        },
                        { upsert: true, new: true }
                    );
                }
            } else if (request.requestType === "Leave") {
                // Loop through all dates from fromDate to toDate
                const start = new Date(request.fromDate);
                const end = new Date(request.toDate);
                
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    await Attendance.findOneAndUpdate(
                        { employee: request.employee, date: dateStr },
                        {
                            $set: {
                                adminId: request.adminId,
                                status: "On Leave",
                                approvalStatus: "Approved",
                                leaveCategory: request.leaveCategory, // Pass Paid/Unpaid to attendance
                                punches: [] // Clear punches for leave day
                            }
                        },
                        { upsert: true, new: true }
                    );
                }
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
