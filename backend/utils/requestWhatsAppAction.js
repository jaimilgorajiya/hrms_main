import User from '../models/User.Model.js';
import Company from '../models/Company.Model.js';
import Request from '../models/Request.Model.js';
import Attendance from '../models/Attendance.Model.js';
import Notification from '../models/Notification.Model.js';
import { isMonthLocked } from './payoutLock.js';
import { sendWhatsAppInteractiveButtons, sendWhatsAppMessage } from './whatsappNotify.js';
import { sendWhatsAppRequestStatusNotification } from '../controllers/WhatsApp.Controller.js';

/**
 * Format a phone number to WhatsApp international format (e.g. "919099705065")
 */
export const normalizeToWaPhone = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
    if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
    if (cleaned.length === 10) return `91${cleaned}`;
    return cleaned;
};

/**
 * Format date string (YYYY-MM-DD) to DD-MM-YYYY
 */
const fmtDateDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
};

/**
 * Format Date or Time string to IST 12h format
 */
const fmtTimeIST = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Resolve the authorized company/admin WhatsApp contact number
 * Exactly matches the number used for the daily attendance report.
 */
export const getCompanyAdminWhatsAppPhone = async (adminId) => {
    const admin = await User.findById(adminId);
    if (!admin) return null;

    const company = await Company.findOne({ adminId: admin._id });
    const rawContact = company?.companyContact || admin.whatsAppNumber || admin.phone;
    return normalizeToWaPhone(rawContact);
};

/**
 * Find admin user and company associated with an incoming WhatsApp phone number.
 */
export const findAdminByCompanyPhone = async (waPhone) => {
    const normalized = normalizeToWaPhone(waPhone);
    if (!normalized) return null;

    const last10 = normalized.slice(-10);

    // 1. Check Company.companyContact
    const company = await Company.findOne({
        companyContact: { $regex: new RegExp(last10 + '$') }
    });

    if (company && company.adminId) {
        const admin = await User.findById(company.adminId);
        if (admin) return { admin, company };
    }

    // 2. Check User (Admin role) phone / whatsAppNumber
    const adminUser = await User.findOne({
        role: 'Admin',
        $or: [
            { phone: { $regex: new RegExp(last10 + '$') } },
            { whatsAppNumber: { $regex: new RegExp(last10 + '$') } }
        ]
    });

    if (adminUser) {
        const linkedCompany = await Company.findOne({ adminId: adminUser._id });
        return { admin: adminUser, company: linkedCompany };
    }

    return null;
};

/**
 * Notify Admin/Company on WhatsApp with interactive Approve/Reject buttons
 * whenever an employee submits ANY request (Leave or Attendance Correction).
 *
 * @param {Object} request - Request document
 */
export const notifyAdminNewRequestViaWhatsApp = async (request) => {
    try {
        if (!request) return;

        // Populate employee and leaveType if not already populated
        let reqDoc = request;
        if (!reqDoc.employee?.name) {
            reqDoc = await Request.findById(request._id)
                .populate('employee', 'name employeeId department designation')
                .populate('leaveType', 'name');
        }

        if (!reqDoc) return;

        const adminId = reqDoc.adminId || reqDoc.employee?.adminId;
        if (!adminId) return;

        const adminWaPhone = await getCompanyAdminWhatsAppPhone(adminId);
        if (!adminWaPhone) {
            console.warn('[WhatsApp Approval] No company contact phone found for admin', adminId);
            return;
        }

        const empName = reqDoc.employee?.name || 'Employee';
        const empId = reqDoc.employee?.employeeId ? ` (${reqDoc.employee.employeeId})` : '';
        const dept = reqDoc.employee?.department ? ` • ${reqDoc.employee.department}` : '';

        let headerText = '';
        let bodyText = '';

        if (reqDoc.requestType === 'Attendance Correction') {
            headerText = 'Attendance Correction Request';
            const dateStr = fmtDateDisplay(reqDoc.fromDate || reqDoc.date);
            const inStr = reqDoc.manualIn ? fmtTimeIST(reqDoc.manualIn) : '--:--';
            const outStr = reqDoc.manualOut ? fmtTimeIST(reqDoc.manualOut) : '--:--';

            bodyText =
                `Employee: ${empName}${empId}${dept}\n` +
                `Type: Attendance Regularization\n` +
                `Date: ${dateStr}\n` +
                `Punch In: ${inStr}\n` +
                `Punch Out: ${outStr}\n` +
                `Reason: ${reqDoc.reason || 'Not specified'}`;

            if (reqDoc.workSummary) {
                bodyText += `\nWork Summary: ${reqDoc.workSummary}`;
            }
        } else {
            // Leave request
            headerText = 'New Leave Request';
            const leaveType = reqDoc.leaveType?.name || reqDoc.leaveTypeName || 'Leave';
            const duration = reqDoc.leaveDuration || 'Full Day';
            const fromStr = fmtDateDisplay(reqDoc.fromDate);
            const toStr = fmtDateDisplay(reqDoc.toDate);
            const category = reqDoc.leaveCategory ? ` [${reqDoc.leaveCategory}]` : '';

            bodyText =
                `Employee: ${empName}${empId}${dept}\n` +
                `Leave Type: ${leaveType}${category}\n` +
                `Duration: ${duration}\n` +
                `From: ${fromStr}\n` +
                `To: ${toStr}\n` +
                `Reason: ${reqDoc.reason || 'Not specified'}`;
        }

        // WhatsApp Interactive Buttons
        const buttons = [
            {
                id: `APPROVE_${reqDoc._id}`,
                title: 'Approve'
            },
            {
                id: `REJECT_${reqDoc._id}`,
                title: 'Reject'
            }
        ];

        await sendWhatsAppInteractiveButtons(adminWaPhone, {
            headerText,
            bodyText,
            footerText: 'HRMS Instant Request Approval',
            buttons
        });

        console.log(`[WhatsApp Approval] Sent request alert to company WhatsApp: ${adminWaPhone} (Request ID: ${reqDoc._id})`);
    } catch (err) {
        console.error('[WhatsApp Approval] Error notifying admin on WhatsApp:', err.message);
    }
};

/**
 * Process Approval / Rejection of a request with full business logic:
 * Updates Request, Attendance records, Notifications, and notifies the Employee on WhatsApp.
 */
export const processRequestApproval = async ({
    requestId,
    adminId,
    status,
    adminRemark = 'Processed via WhatsApp'
}) => {
    if (!['Approved', 'Rejected'].includes(status)) {
        throw new Error('Invalid status. Must be Approved or Rejected.');
    }

    const query = { _id: requestId };
    if (adminId) query.adminId = adminId;

    const request = await Request.findOne(query)
        .populate('employee', 'name employeeId phone whatsAppNumber department')
        .populate('leaveType', 'name');

    if (!request) {
        throw new Error('Request not found or unauthorized.');
    }

    if (request.status !== 'Pending') {
        return {
            alreadyProcessed: true,
            status: request.status,
            request
        };
    }

    // Check month lock
    const checkStart = request.fromDate || request.date;
    const checkEnd = request.toDate || request.date;
    const empId = request.employee?._id || request.employee;

    if (checkStart && (await isMonthLocked(empId, checkStart, checkEnd))) {
        throw new Error('Attendance/Leave for this month has been locked.');
    }

    request.status = status;
    request.adminRemark = adminRemark;
    request.actionDate = new Date();
    await request.save();

    // If Approved, update Attendance records
    if (status === 'Approved') {
        if (request.requestType === 'Attendance Correction') {
            const existing = await Attendance.findOne({ employee: empId, date: request.date });

            if (existing && existing.punches.length > 0 && !existing.punches.some(p => p.type === 'OUT')) {
                // Ghost punch: append OUT
                await Attendance.findOneAndUpdate(
                    { _id: existing._id },
                    {
                        $set: { status: 'Present', approvalStatus: 'Approved', adminId: request.adminId },
                        $push: {
                            punches: {
                                time: request.manualOut,
                                type: 'OUT',
                                locationAddress: 'Manual Entry (Correction)',
                                workSummary: request.workSummary || 'Missed Punch Correction'
                            }
                        }
                    }
                );
            } else {
                // Upsert full punch IN and OUT
                await Attendance.findOneAndUpdate(
                    { employee: empId, date: request.date },
                    {
                        $set: {
                            adminId: request.adminId,
                            status: 'Present',
                            approvalStatus: 'Approved',
                            punches: [
                                { time: request.manualIn, type: 'IN', locationAddress: 'Manual Entry' },
                                { time: request.manualOut, type: 'OUT', locationAddress: 'Manual Entry', workSummary: request.workSummary }
                            ]
                        }
                    },
                    { upsert: true, new: true }
                );
            }
        } else if (request.requestType === 'Leave') {
            const start = new Date(request.fromDate);
            const end = new Date(request.toDate);
            const isHalfDay = request.leaveDuration === 'First Half' || request.leaveDuration === 'Second Half';
            const attendanceStatus = isHalfDay ? 'Half Day' : 'On Leave';

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                await Attendance.findOneAndUpdate(
                    { employee: empId, date: dateStr },
                    {
                        $set: {
                            adminId: request.adminId,
                            status: attendanceStatus,
                            approvalStatus: 'Approved',
                            leaveCategory: request.leaveCategory,
                            leaveDuration: request.leaveDuration,
                            punches: []
                        }
                    },
                    { upsert: true, new: true }
                );
            }
        }
    }

    // In-app Notification for Employee
    try {
        await Notification.create({
            user: empId,
            title: `Request ${status}`,
            message: `Your ${request.requestType} for ${request.date || request.fromDate} has been ${status.toLowerCase()}.`,
            type: request.requestType === 'Leave' ? 'Leave' : 'Other'
        });
    } catch (_) {}

    // WhatsApp Notification to Employee
    try {
        await sendWhatsAppRequestStatusNotification(request, status);
    } catch (waErr) {
        console.error('[WhatsApp Approval] Employee notification error (non-critical):', waErr.message);
    }

    return {
        success: true,
        alreadyProcessed: false,
        status,
        request
    };
};

/**
 * Handle incoming admin action from WhatsApp (Button click or Text message)
 */
export const handleAdminWhatsAppAction = async ({ fromPhone, buttonId = null, text = null }) => {
    try {
        const adminData = await findAdminByCompanyPhone(fromPhone);
        if (!adminData || !adminData.admin) {
            return null; // Not an authorized company/admin sender
        }

        const admin = adminData.admin;
        let action = null;
        let targetRequestId = null;

        // 1. Check interactive button click (e.g. "APPROVE_678..." or "REJECT_678...")
        if (buttonId) {
            if (buttonId.startsWith('APPROVE_')) {
                action = 'Approved';
                targetRequestId = buttonId.replace('APPROVE_', '').trim();
            } else if (buttonId.startsWith('REJECT_')) {
                action = 'Rejected';
                targetRequestId = buttonId.replace('REJECT_', '').trim();
            }
        }

        // 2. Check text commands (e.g. "APPROVE 678...", "REJECT 678...", or simple "APPROVE" / "REJECT")
        if (!action && text) {
            const cleanText = text.trim().toLowerCase();

            if (cleanText.startsWith('approve') || cleanText === '1' || cleanText === 'yes') {
                action = 'Approved';
                const parts = text.trim().split(/\s+/);
                if (parts.length > 1 && parts[1].length >= 12) {
                    targetRequestId = parts[1];
                }
            } else if (cleanText.startsWith('reject') || cleanText === '2' || cleanText === 'no') {
                action = 'Rejected';
                const parts = text.trim().split(/\s+/);
                if (parts.length > 1 && parts[1].length >= 12) {
                    targetRequestId = parts[1];
                }
            }
        }

        if (!action) return null;

        // If no explicit requestId provided in text, find the most recent Pending request for this admin
        let requestToProcess = null;
        if (targetRequestId) {
            requestToProcess = await Request.findOne({
                _id: targetRequestId,
                adminId: admin._id
            });
        } else {
            requestToProcess = await Request.findOne({
                adminId: admin._id,
                status: 'Pending'
            }).sort({ createdAt: -1 });
        }

        if (!requestToProcess) {
            return `No pending request found to ${action.toLowerCase()}.`;
        }

        // Execute approval/rejection
        const result = await processRequestApproval({
            requestId: requestToProcess._id,
            adminId: admin._id,
            status: action,
            adminRemark: `Processed via Company WhatsApp (${fromPhone})`
        });

        if (result.alreadyProcessed) {
            return `This request has already been ${result.status.toLowerCase()}.`;
        }

        const empName = result.request.employee?.name || 'the employee';
        const reqType = result.request.requestType || 'Request';

        return `Action Confirmed\n\n` +
            `The ${reqType} for ${empName} has been ${action}.\n\n` +
            `The employee has been automatically notified on WhatsApp and their attendance/leave records have been updated.`;
    } catch (err) {
        console.error('[WhatsApp Approval] Error handling admin action:', err);
        return `Failed to process request action: ${err.message}`;
    }
};
