import RetirementRecord from '../models/RetirementRecord.Model.js';
import RetirementSetting from '../models/RetirementSetting.Model.js';
import User from '../models/User.Model.js';
import { sendRetirementNotificationEmail } from '../utils/emailService.js';

// Determine retirement age for an employee based on settings priority
const resolveRetirementAge = (emp, setting) => {
    // 1. Employee-specific custom retirement age
    if (emp.retirementAge && emp.retirementAge > 0) return emp.retirementAge;

    // 2. Department-based override
    if (setting.enableDepartmentBasedAge && emp.department) {
        const override = setting.departmentAgeOverrides?.find(
            o => o.departmentName === emp.department
        );
        if (override) return override.retirementAge;
    }

    // 3. Role-based override
    if (setting.enableRoleBasedAge && emp.designation) {
        const override = setting.roleAgeOverrides?.find(
            o => o.roleName === emp.designation
        );
        if (override) return override.retirementAge;
    }

    // 4. Default
    return setting.defaultRetirementAge;
};

// Calculate retirement date from DOB and age
const calcRetirementDate = (dob, age) => {
    const d = new Date(dob);
    d.setFullYear(d.getFullYear() + age);
    return d;
};

// Sync/build retirement records for all eligible employees
export const syncRetirementRecords = async (adminId) => {
    const setting = await RetirementSetting.findOne({ adminId });
    if (!setting) return;

    const today = new Date();
    const employees = await User.find({
        role: { $ne: 'Admin' },
        status: { $in: ['Active', 'Inactive', 'Onboarding'] },
        dateOfBirth: { $exists: true, $ne: null }
    });

    for (const emp of employees) {
        if (!emp.dateOfBirth) continue;

        const age = resolveRetirementAge(emp, setting);
        const retDate = calcRetirementDate(emp.dateOfBirth, age);

        // Skip if retired more than 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (retDate < thirtyDaysAgo) continue;

        await RetirementRecord.findOneAndUpdate(
            { adminId, employeeId: emp._id },
            {
                $setOnInsert: {
                    adminId,
                    employeeId: emp._id,
                    retirementAge: age,
                    retirementDate: retDate,
                    originalRetirementDate: retDate,
                    status: retDate <= today ? 'Completed' : 'Upcoming',
                    completedAt: retDate <= today ? retDate : undefined
                }
            },
            { upsert: true }
        );

        // Update retirement date if age changed (but don't override Extended status)
        const existing = await RetirementRecord.findOne({ adminId, employeeId: emp._id });
        if (existing && existing.status !== 'Extended') {
            existing.retirementAge = age;
            existing.retirementDate = retDate;
            existing.originalRetirementDate = retDate;
            // Reset to Upcoming if exit was never actually initiated
            if (!existing.exitInitiatedAt && existing.status === 'In Process') {
                existing.status = 'Upcoming';
            }
            // Auto-complete if retirement date has passed
            if (retDate <= today && !['Completed'].includes(existing.status)) {
                existing.status = 'Completed';
                existing.completedAt = existing.completedAt || retDate;
            }
            await existing.save();
        }
    }
};

// GET /api/retirement — list all retirement records with employee data
export const getRetirementList = async (req, res) => {
    try {
        const adminId = req.user._id;
        await syncRetirementRecords(adminId);

        const { department, designation, status, from, to } = req.query;

        const records = await RetirementRecord.find({ adminId })
            .populate('employeeId', 'name dateOfBirth department designation employmentType branch profilePhoto retirementAge')
            .sort({ retirementDate: 1 });

        const today = new Date();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

        let list = records
            .filter(r => r.employeeId) // guard against deleted employees
            .map(r => {
                const emp = r.employeeId;
                const daysRemaining = Math.ceil((new Date(r.retirementDate) - today) / (1000 * 60 * 60 * 24));
                return {
                    _id: r._id,
                    employeeId: emp._id,
                    name: emp.name,
                    dateOfBirth: emp.dateOfBirth,
                    department: emp.department,
                    designation: emp.designation,
                    employmentType: emp.employmentType,
                    branch: emp.branch,
                    profilePhoto: emp.profilePhoto,
                    retirementAge: r.retirementAge,
                    retirementDate: r.retirementDate,
                    originalRetirementDate: r.originalRetirementDate,
                    daysRemaining,
                    status: r.status,
                    extensionMonths: r.extensionMonths,
                    extensionReason: r.extensionReason,
                    notificationsSent: r.notificationsSent,
                    exitInitiatedAt: r.exitInitiatedAt,
                    completedAt: r.completedAt,
                    notes: r.notes
                };
            });

        // Only show employees retiring within 6 months or recently past retirement date
        list = list.filter(r => new Date(r.retirementDate) <= sixMonthsLater && r.daysRemaining >= -30);

        // Apply filters
        if (department) list = list.filter(r => r.department === department);
        if (designation) list = list.filter(r => r.designation === designation);
        if (status) list = list.filter(r => r.status === status);
        if (from) list = list.filter(r => new Date(r.retirementDate) >= new Date(from));
        if (to) list = list.filter(r => new Date(r.retirementDate) <= new Date(to));

        res.status(200).json({ success: true, records: list });
    } catch (error) {
        console.error('getRetirementList error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// GET /api/retirement/stats — dashboard widget data
export const getRetirementStats = async (req, res) => {
    try {
        const adminId = req.user._id;
        const today = new Date();

        const records = await RetirementRecord.find({ adminId })
            .populate('employeeId', 'name department designation profilePhoto dateOfBirth');

        const active = records.filter(r => r.employeeId && !['Completed'].includes(r.status));

        const stats = {
            total: active.length,
            within30: active.filter(r => {
                const days = Math.ceil((new Date(r.retirementDate) - today) / 86400000);
                return days >= 0 && days <= 30;
            }).length,
            within90: active.filter(r => {
                const days = Math.ceil((new Date(r.retirementDate) - today) / 86400000);
                return days > 30 && days <= 90;
            }).length,
            beyond90: active.filter(r => {
                const days = Math.ceil((new Date(r.retirementDate) - today) / 86400000);
                return days > 90;
            }).length,
        };

        res.status(200).json({ success: true, stats });
    } catch (error) {
        console.error('getRetirementStats error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// PUT /api/retirement/:id/initiate-exit
export const initiateExit = async (req, res) => {
    try {
        const record = await RetirementRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        record.status = 'In Process';
        record.exitInitiatedAt = new Date();
        await record.save();

        res.status(200).json({ success: true, message: 'Exit process initiated', record });
    } catch (error) {
        console.error('initiateExit error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// PUT /api/retirement/:id/extend
export const extendRetirement = async (req, res) => {
    try {
        const { extensionMonths, reason } = req.body;
        const adminId = req.user._id;

        if (!extensionMonths || extensionMonths <= 0) {
            return res.status(400).json({ success: false, message: 'Extension duration is required' });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Reason for extension is required' });
        }

        const setting = await RetirementSetting.findOne({ adminId });
        if (!setting?.allowExtension) {
            return res.status(400).json({ success: false, message: 'Extensions are not allowed per company policy' });
        }
        if (extensionMonths > setting.maxExtensionMonths) {
            return res.status(400).json({ success: false, message: `Maximum extension allowed is ${setting.maxExtensionMonths} months` });
        }

        const record = await RetirementRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        const base = record.originalRetirementDate || record.retirementDate;
        const newDate = new Date(base);
        newDate.setMonth(newDate.getMonth() + Number(extensionMonths));

        record.extensionMonths = extensionMonths;
        record.extensionReason = reason;
        record.retirementDate = newDate;
        record.status = 'Extended';
        await record.save();

        res.status(200).json({ success: true, message: 'Retirement extended successfully', record });
    } catch (error) {
        console.error('extendRetirement error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// PUT /api/retirement/:id/complete
export const markCompleted = async (req, res) => {
    try {
        const record = await RetirementRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        record.status = 'Completed';
        record.completedAt = new Date();
        await record.save();

        res.status(200).json({ success: true, message: 'Marked as completed', record });
    } catch (error) {
        console.error('markCompleted error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// POST /api/retirement/run-notifications — daily job endpoint
export const runNotifications = async (req, res) => {
    try {
        const adminId = req.user._id;
        const setting = await RetirementSetting.findOne({ adminId });
        if (!setting) return res.status(200).json({ success: true, message: 'No settings found' });

        const today = new Date();
        const records = await RetirementRecord.find({
            adminId,
            status: { $in: ['Upcoming', 'Notified', 'Extended'] }
        }).populate('employeeId', 'name email department designation');

        let notified = 0;

        for (const record of records) {
            if (!record.employeeId) continue;
            const daysRemaining = Math.ceil((new Date(record.retirementDate) - today) / 86400000);

            for (const threshold of setting.notificationDays) {
                // Check if already sent for this threshold
                const alreadySent = record.notificationsSent?.some(n => n.days === threshold);
                if (alreadySent) continue;

                // Send if within threshold (daysRemaining <= threshold and > threshold - 1)
                if (daysRemaining <= threshold && daysRemaining >= 0) {
                    // Send email notification
                    try {
                        await sendRetirementNotificationEmail(
                            record.employeeId.email,
                            record.employeeId.name,
                            record.retirementDate,
                            daysRemaining
                        );
                    } catch (emailErr) {
                        console.error('Email notification failed:', emailErr.message);
                    }

                    record.notificationsSent = record.notificationsSent || [];
                    record.notificationsSent.push({ days: threshold, sentAt: new Date() });
                    record.status = 'Notified';
                    notified++;
                }
            }
            await record.save();
        }

        res.status(200).json({ success: true, message: `${notified} notification(s) sent` });
    } catch (error) {
        console.error('runNotifications error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
