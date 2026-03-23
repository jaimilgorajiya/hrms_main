import EmploymentType from "../models/EmploymentType.Model.js";

const createEmploymentType = async (req, res) => {
    try {
        const { name, description } = req.body;
        const exists = await EmploymentType.findOne({ name });

        if (exists) {
            return res.status(400).json({ success: false, message: "Employment type already exists" });
        }

        const newType = new EmploymentType({ name, description });
        await newType.save();

        res.status(201).json({ success: true, message: "Employment type created successfully", type: newType });
    } catch (error) {
        console.log("Error in createEmploymentType controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getEmploymentTypes = async (req, res) => {
    try {
        const types = await EmploymentType.find({});
        res.status(200).json({ success: true, types });
    } catch (error) {
        console.log("Error in getEmploymentTypes controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateEmploymentType = async (req, res) => {
    try {
        const { name, description } = req.body;
        const type = await EmploymentType.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true, runValidators: true }
        );

        if (!type) {
            return res.status(404).json({ success: false, message: "Employment type not found" });
        }

        res.status(200).json({ success: true, message: "Employment type updated successfully", type });
    } catch (error) {
        console.log("Error in updateEmploymentType controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteEmploymentType = async (req, res) => {
    try {
        const type = await EmploymentType.findByIdAndDelete(req.params.id);
        if (!type) {
            return res.status(404).json({ success: false, message: "Employment type not found" });
        }
        res.status(200).json({ success: true, message: "Employment type deleted successfully" });
    } catch (error) {
        console.log("Error in deleteEmploymentType controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export { createEmploymentType, getEmploymentTypes, updateEmploymentType, deleteEmploymentType };
