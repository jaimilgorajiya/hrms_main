import SalaryGroup from "../models/SalaryGroup.Model.js";
import User from "../models/User.Model.js";

// POST /api/salary-groups/add
export const createSalaryGroup = async (req, res) => {
    try {
        const { groupName, payrollFrequency, workingDaysType, salaryCycleStartDate, roundedSalary, status } = req.body;
        const adminId = req.user._id;

        const existing = await SalaryGroup.findOne({ adminId, groupName });
        if (existing) return res.status(400).json({ success: false, message: "Salary Group name already exists" });

        const newGroup = new SalaryGroup({
            groupName,
            payrollFrequency,
            workingDaysType,
            salaryCycleStartDate,
            roundedSalary,
            status,
            adminId
        });

        await newGroup.save();
        res.status(201).json({ success: true, message: "Salary Group created successfully", salaryGroup: newGroup });
    } catch (error) {
        console.error("createSalaryGroup error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/salary-groups/all
export const getSalaryGroups = async (req, res) => {
    try {
        const adminId = req.user._id;
        const groups = await SalaryGroup.find({ adminId })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, groups });
    } catch (error) {
        console.error("getSalaryGroups error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// GET /api/salary-groups/:id
export const getSalaryGroupById = async (req, res) => {
    try {
        const adminId = req.user._id;
        const group = await SalaryGroup.findOne({ _id: req.params.id, adminId });

        if (!group) return res.status(404).json({ success: false, message: "Salary Group not found" });

        res.status(200).json({ success: true, salaryGroup: group });
    } catch (error) {
        console.error("getSalaryGroupById error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// PUT /api/salary-groups/update/:id
export const updateSalaryGroup = async (req, res) => {
    try {
        const adminId = req.user._id;
        const group = await SalaryGroup.findOneAndUpdate(
            { _id: req.params.id, adminId },
            { $set: req.body },
            { new: true }
        );

        if (!group) return res.status(404).json({ success: false, message: "Salary Group not found" });

        res.status(200).json({ success: true, message: "Salary Group updated successfully", salaryGroup: group });
    } catch (error) {
        console.error("updateSalaryGroup error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// DELETE /api/salary-groups/delete/:id
export const deleteSalaryGroup = async (req, res) => {
    try {
        const adminId = req.user._id;

        // Check if any user is using this group
        const userCount = await User.countDocuments({ "workSetup.salaryGroup": req.params.id });
        if (userCount > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete: Group is assigned to employees" });
        }

        const group = await SalaryGroup.findOneAndDelete({ _id: req.params.id, adminId });
        if (!group) return res.status(404).json({ success: false, message: "Salary Group not found" });

        res.status(200).json({ success: true, message: "Salary Group deleted successfully" });
    } catch (error) {
        console.error("deleteSalaryGroup error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
