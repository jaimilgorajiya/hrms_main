import Department from "../models/Department.Model.js";
import fs from 'fs';

const createDepartment = async (req, res) => {
    try {
        const { name, branchId } = req.body;
        const adminId = req.user._id;

        if (!name || !branchId) {
            return res.status(400).json({ success: false, message: "Name and Branch are required" });
        }

        // Try to sync indexes to ensure unique constraints are correctly applied
        await Department.syncIndexes().catch(e => console.log("Sync Indexes Error:", e.message));

        const count = await Department.countDocuments({ adminId, branchId });

        const newDepartment = new Department({ 
            name, 
            branchId,
            adminId,
            order: count
        });
        await newDepartment.save();

        res.status(201).json({ success: true, message: "Department created successfully", department: newDepartment });
    } catch (error) {
        // Detailed logging to a file for investigation
        fs.appendFileSync('error_debug.txt', `\n[${new Date().toISOString()}] Error: ${JSON.stringify(error, null, 2)} \nData: ${JSON.stringify(req.body)} User: ${req.user._id}\n`);

        console.error("Detailed error in createDepartment:", error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: "Department with this name already exists in this branch" 
            });
        }
        
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ success: false, message });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID: ${error.value}` });
        }

        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const bulkCreateDepartments = async (req, res) => {
    try {
        const { departments, branchId } = req.body; 
        const adminId = req.user._id;

        if (!branchId || !Array.isArray(departments) || departments.length === 0) {
            return res.status(400).json({ success: false, message: "Branch and departments list are required" });
        }

        const startOrder = await Department.countDocuments({ adminId, branchId });

        const deptToInsert = departments.map((name, index) => ({
            name,
            branchId,
            adminId,
            order: startOrder + index
        }));

        await Department.insertMany(deptToInsert);

        res.status(201).json({ success: true, message: "Departments added successfully" });
    } catch (error) {
        console.error("Detailed error in bulkCreateDepartments:", error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: "One or more departments already exist in this branch" 
            });
        }
        
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join(", ");
            return res.status(400).json({ success: false, message });
        }

        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const getDepartments = async (req, res) => {
    try {
        const adminId = req.user._id;
        const departments = await Department.find({ adminId }).sort({ branchId: 1, order: 1 });
        res.status(200).json({ success: true, departments });
    } catch (error) {
        console.error("Error in getDepartments:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateDepartment = async (req, res) => {
    try {
        const { name, branchId } = req.body;
        const adminId = req.user._id;

        const department = await Department.findOneAndUpdate(
            { _id: req.params.id, adminId },
            { name, branchId },
            { new: true }
        );

        if (!department) {
            return res.status(404).json({ success: false, message: "Department not found" });
        }

        res.status(200).json({ success: true, message: "Department updated successfully", department });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Department already exists in this branch" });
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        const adminId = req.user._id;
        const department = await Department.findOneAndDelete({ _id: req.params.id, adminId });
        
        if (!department) {
            return res.status(404).json({ success: false, message: "Department not found" });
        }
        res.status(200).json({ success: true, message: "Department deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const reorderDepartments = async (req, res) => {
    try {
        const { reorderedDepartments } = req.body; // Array of { _id, order }
        const adminId = req.user._id;

        const bulkOps = reorderedDepartments.map((item, index) => ({
            updateOne: {
                filter: { _id: item._id, adminId },
                update: { $set: { order: index } }
            }
        }));

        await Department.bulkWrite(bulkOps);

        res.status(200).json({ success: true, message: "Order updated successfully" });
    } catch (error) {
        console.error("Reorder Dept Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export { createDepartment, bulkCreateDepartments, getDepartments, updateDepartment, deleteDepartment, reorderDepartments };
