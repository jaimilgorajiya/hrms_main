import Request from "../models/Request.Model.js";
import Attendance from "../models/Attendance.Model.js";
import User from "../models/User.Model.js";
import Notification from "../models/Notification.Model.js";
import LeaveType from "../models/LeaveType.Model.js";
import LeaveGroup from "../models/LeaveGroup.Model.js";
import Holiday from "../models/Holiday.Model.js";
import { isMonthLocked } from "../utils/payoutLock.js";
import { sendWhatsAppRequestStatusNotification } from "./WhatsApp.Controller.js";
import { calculateLeaveSplit } from "../utils/leaveSplit.js";
import { notifyAdminNewRequestViaWhatsApp, processRequestApproval } from "../utils/requestWhatsAppAction.js";

// Helper to get all overlapping days of a range [fromDateStr, toDateStr] in a given year-month YYYY-MM
const getOverlappingDaysInMonth = (fromDateStr, toDateStr, leaveDuration, yearMonthStr) => {
    const monthStart = new Date(yearMonthStr + "-01");
    const [year, month] = yearMonthStr.split('-').map(Number);
    const monthEnd = new Date(year, month, 0); // last day of month

    const reqStart = new Date(fromDateStr);
    const reqEnd = new Date(toDateStr);

    const overlapStart = new Date(Math.max(monthStart.getTime(), reqStart.getTime()));
    const overlapEnd = new Date(Math.min(monthEnd.getTime(), reqEnd.getTime()));
    
    if (overlapStart > overlapEnd) {
        return 0;
    }

    const diffMs = overlapEnd.getTime() - overlapStart.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    return leaveDuration === "Full Day" ? diffDays : 0.5;
};

// Helper to group requested days of a leave request by month
const getDaysPerMonth = (startStr, endStr, leaveDuration) => {
    const daysMap = {};
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (leaveDuration !== "Full Day") {
        const ym = startStr.substring(0, 7);
        daysMap[ym] = 0.5;
        return daysMap;
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ym = d.toISOString().split('T')[0].substring(0, 7);
        daysMap[ym] = (daysMap[ym] || 0) + 1;
    }
    return daysMap;
};

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

        // ── HOLIDAY CHECK ──
        if (checkStart && checkEnd) {
            const holidays = await Holiday.find({
                adminId,
                status: 'Active',
                date: { $gte: checkStart, $lte: checkEnd }
            });
            const applicableHoliday = holidays.find(h => {
                if (h.applicableTo === 'All') return true;
                if (h.applicableTo === 'Branch' && h.branches?.includes(employee.branch)) return true;
                if (h.applicableTo === 'Department' && h.departments?.includes(employee.department)) return true;
                return false;
            });

            if (applicableHoliday) {
                return res.status(400).json({
                    success: false,
                    message: `Selected date range includes a holiday (${applicableHoliday.name} on ${applicableHoliday.date}). Leave/Attendance correction cannot be requested on a holiday.`
                });
            }
        }

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

            // 3. Paid Leave Balance and Monthly Limit Check with Auto-Split
            if (leaveCategory === 'Paid') {
                const splitInfo = await calculateLeaveSplit({
                    employee,
                    fromDate: startStr,
                    toDate: endStr,
                    leaveDuration: leaveDuration || "Full Day",
                    leaveCategory: "Paid"
                });

                if (splitInfo.isSplit && splitInfo.segments.length > 1) {
                    const createdRequests = [];
                    for (const seg of splitInfo.segments) {
                        const segReq = new Request({
                            employee: employeeId,
                            adminId,
                            requestType: 'Leave',
                            leaveType: seg.category === 'Paid' ? (leaveType || undefined) : undefined,
                            leaveTypeName: seg.category === 'Paid' ? (lt?.name || 'Paid Leave') : 'Unpaid Leave',
                            leaveDuration: seg.duration,
                            leaveCategory: seg.category,
                            fromDate: seg.fromDate,
                            toDate: seg.toDate,
                            date: seg.fromDate,
                            reason: seg.category === 'Unpaid'
                                ? `${reason} (Auto-Split: Unpaid Leave / Quota Exceeded)`
                                : reason,
                            submittedVia: 'Web'
                        });
                        await segReq.save();
                        createdRequests.push(segReq);
                        // Notify company admin on WhatsApp for each segment
                        notifyAdminNewRequestViaWhatsApp(segReq).catch(() => {});
                    }

                    return res.status(201).json({
                        success: true,
                        message: `Leave submitted with Auto-Split: ${splitInfo.paidDays} day(s) Paid and ${splitInfo.unpaidDays} day(s) Unpaid (Loss of Pay).`,
                        request: createdRequests[0],
                        requests: createdRequests,
                        splitInfo
                    });
                } else if (splitInfo.isSplit && splitInfo.paidDays === 0) {
                    // Entire leave converted to Unpaid
                    const unpaidReq = new Request({
                        employee: employeeId,
                        adminId,
                        requestType: 'Leave',
                        leaveType: undefined,
                        leaveTypeName: 'Unpaid Leave',
                        leaveDuration: leaveDuration || "Full Day",
                        leaveCategory: "Unpaid",
                        fromDate: startStr,
                        toDate: endStr,
                        date: startStr,
                        reason: `${reason} (${splitInfo.reasonForSplit || 'Unpaid Leave / Quota Exhausted'})`,
                        submittedVia: 'Web'
                    });
                    await unpaidReq.save();
                    notifyAdminNewRequestViaWhatsApp(unpaidReq).catch(() => {});

                    return res.status(201).json({
                        success: true,
                        message: `Leave submitted as Unpaid Leave (${splitInfo.reasonForSplit || 'Quota exhausted'}).`,
                        request: unpaidReq,
                        splitInfo
                    });
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

        // Notify company admin on WhatsApp with Interactive Approve/Reject buttons
        notifyAdminNewRequestViaWhatsApp(newRequest).catch(() => {});

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

        const result = await processRequestApproval({
            requestId,
            adminId: req.user._id,
            status,
            adminRemark
        });

        res.status(200).json({
            success: true,
            message: `Request ${status} successfully`,
            request: result.request
        });
    } catch (error) {
        console.error("updateRequestStatus error:", error);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
