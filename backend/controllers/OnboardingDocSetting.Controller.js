import OnboardingDocSetting from '../models/OnboardingDocSetting.Model.js';
import User from '../models/User.Model.js';
import DocumentType from '../models/DocumentType.Model.js';

export const getOnboardingEmployees = async (req, res) => {
    try {
        const { branch, department } = req.query;
        const adminId = req.user._id;

        const query = { 
            // role: 'Employee', // User might want to see all who need onboarding
            status: { $in: ['Active', 'Onboarding', 'Inactive'] } 
        };

        if (branch) {
            query['workSetup.location'] = branch;
        }

        if (department) {
            query['department'] = department;
        }

        const employees = await User.find(query).select('name department workSetup.location').sort({ name: 1 });
        
        // Get existing settings
        const employeeIds = employees.map(e => e._id);
        const settings = await OnboardingDocSetting.find({ employeeId: { $in: employeeIds } });

        const data = employees.map(emp => {
            const setting = settings.find(s => s.employeeId.toString() === emp._id.toString());
            return {
                _id: emp._id,
                name: emp.name,
                department: emp.department,
                branch: emp.workSetup?.location,
                setting: setting ? setting.requirementType : 'Always Required',
                customDocuments: setting ? setting.customDocuments : []
            };
        });

        res.status(200).json(data);
    } catch (error) {
        console.error("Error in getOnboardingEmployees:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateOnboardingSettings = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeIds, requirementType, customDocuments } = req.body;

        if (!employeeIds || !Array.isArray(employeeIds)) {
            return res.status(400).json({ success: false, message: "Invalid employee IDs" });
        }

        const bulkOps = employeeIds.map(id => ({
            updateOne: {
                filter: { employeeId: id, adminId },
                update: { 
                    $set: { 
                        requirementType,
                        customDocuments: requirementType === 'Custom' ? customDocuments : []
                    } 
                },
                upsert: true
            }
        }));

        await OnboardingDocSetting.bulkWrite(bulkOps);

        res.status(200).json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
        console.error("Error in updateOnboardingSettings:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateIndividualSetting = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeId, requirementType, customDocuments } = req.body;

        const setting = await OnboardingDocSetting.findOneAndUpdate(
            { employeeId, adminId },
            { requirementType, customDocuments: requirementType === 'Custom' ? customDocuments : [] },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: "Setting updated", setting });
    } catch (error) {
        console.error("Error in updateIndividualSetting:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
