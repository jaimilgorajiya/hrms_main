import User from "../models/User.Model.js";
import Role from "../models/Role.Model.js";
import Grade from "../models/Grade.Model.js";
import Resignation from "../models/Resignation.Model.js";
import ExitRecord from "../models/ExitRecord.Model.js";
import Onboarding from "../models/Onboarding.Model.js";

// MANAGERS LIST
const getManagers = async (req, res) => {
    try {
        const managers = await User.find({ role: 'Manager' }).select("-password");
        res.status(200).json({ success: true, managers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// EX-EMPLOYEES LIST
const getExEmployees = async (req, res) => {
    try {
        const users = await User.find({ 
            status: { $in: ['Resigned', 'Terminated', 'Inactive', 'Absconding', 'Retired'] } 
        }).select("-password");

        const userIds = users.map(user => user._id);
        const exitRecords = await ExitRecord.find({ userId: { $in: userIds } });

        const exEmployees = users.map(user => {
            const exitRecord = exitRecords.find(record => record.userId.toString() === user._id.toString());
            return {
                ...user.toObject(),
                joiningDate: user.createdAt,
                exitDate: exitRecord ? exitRecord.exitDate : null,
                exitReason: exitRecord ? exitRecord.reason : 'Not Recorded',
                settlementStatus: exitRecord ? exitRecord.status : 'Pending',
                paymentStatus: exitRecord && exitRecord.fullAndFinal ? exitRecord.fullAndFinal.paymentStatus : 'Pending',
                settlementAmount: exitRecord && exitRecord.fullAndFinal ? exitRecord.fullAndFinal.settlementAmount : 0,
                documentsIssued: exitRecord ? exitRecord.documentsIssued : { experienceLetter: false, relievingLetter: false },
                departmentClearance: exitRecord ? exitRecord.departmentClearance : {},
                isActive: false // For archive logic
            };
        });

        res.status(200).json({ success: true, exEmployees });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW JOINERS (ONBOARDING PIPELINE)
const getNewJoiners = async (req, res) => {
    try {
        const newJoiners = await User.find({ status: 'Onboarding' }).select("-password");
        const userIds = newJoiners.map(u => u._id);
        const onboardingRecords = await Onboarding.find({ userId: { $in: userIds } });

        const detailedJoiners = newJoiners.map(user => {
            const record = onboardingRecords.find(r => r.userId.toString() === user._id.toString());
            // Calculate progress
            let completedTasks = 0;
            let totalTasks = 0;
            if (record) {
                const checklistVals = Object.values(record.checklist || {});
                const itVals = Object.values(record.itSetup || {});
                completedTasks = checklistVals.filter(v => v === true).length + itVals.filter(v => v === true).length;
                totalTasks = checklistVals.length + itVals.length;
            }

            return {
                ...user.toObject(),
                onboardingStatus: record ? record.status : 'Pre-Boarding',
                joiningDate: record ? record.joiningDate : user.createdAt,
                checklistProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
                buddyId: record ? record.buddy : null,
                inductionDate: record ? record.inductionDate : null
            };
        });

        res.status(200).json({ success: true, newJoiners: detailedJoiners });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getOnboardingDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        let record = await Onboarding.findOne({ userId }).populate('buddy', 'name email designation');
        
        if (!record) {
             const user = await User.findById(userId);
             if (user && user.status === 'Onboarding') {
                 record = await Onboarding.create({
                     userId,
                     joiningDate: user.createdAt,
                     status: 'Pre-Boarding'
                 });
             } else {
                 return res.status(404).json({ success: false, message: "Onboarding record not found" });
             }
        }
        res.status(200).json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateOnboardingDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        const record = await Onboarding.findOneAndUpdate(
            { userId }, 
            updates, 
            { new: true, upsert: true }
        );

        // Auto-activate user if onboarding is completed
        if (updates.status === 'Completed') {
            await User.findByIdAndUpdate(userId, { status: 'Active' });
        }

        res.status(200).json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// UPCOMING RETIREMENTS
const getUpcomingRetirements = async (req, res) => {
    try {
        // Assuming retirement age is 60
        const retirementAge = 60;
        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);

        // Find users whose 60th birthday is within next 6 months
        // Note: Logic simplification. In prod, use DOB field + aggregation.
        // Assuming user has 'dob' field.
        const users = await User.find({ dob: { $exists: true } }).select("-password");
        
        const retiringUsers = users.filter(user => {
            if (!user.dob) return false;
            const birthDate = new Date(user.dob);
            const retirementDate = new Date(birthDate.getFullYear() + retirementAge, birthDate.getMonth(), birthDate.getDate());
            return retirementDate >= today && retirementDate <= sixMonthsFromNow;
        });

        res.status(200).json({ success: true, retiringUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// OTHER EMPLOYEES (CONTRACT/INTERN)
const getOtherEmployees = async (req, res) => {
    try {
        const others = await User.find({ employmentType: { $in: ['Contract', 'Intern', 'Freelance'] } }).select("-password");
        res.status(200).json({ success: true, others });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// EXIT RECORD MANAGEMENT
const getExitRecord = async (req, res) => {
    try {
        const { userId } = req.params;
        let exitRecord = await ExitRecord.findOne({ userId });

        if (!exitRecord) {
            // Check if user exists and is an ex-employee to create a default record
            const user = await User.findById(userId);
            if (user && ['Resigned', 'Terminated', 'Inactive'].includes(user.status)) {
                exitRecord = await ExitRecord.create({
                    userId,
                    exitDate: new Date(), 
                    reason: 'Not specified',
                    status: 'Pending Clearance'
                });
            } else {
                 return res.status(404).json({ success: false, message: "Exit record not found" });
            }
        }
        res.status(200).json({ success: true, exitRecord });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const updateExitRecord = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        
        const exitRecord = await ExitRecord.findOneAndUpdate(
            { userId }, 
            updates, 
            { new: true, upsert: true }
        );
        
        res.status(200).json({ success: true, exitRecord });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export { 
    getManagers, 
    getExEmployees, 
    getNewJoiners, 
    getUpcomingRetirements, 
    getOtherEmployees,
    getExitRecord,
    updateExitRecord,
    getOnboardingDetails,
    updateOnboardingDetails
};
