import EarningDeductionType from "../models/EarningDeductionType.Model.js";

const getEarningDeductionTypes = async (req, res) => {
    try {
        const adminId = req.user._id;
        const types = await EarningDeductionType.find({ adminId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, earningDeductionTypes: types });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in fetching earning/deduction types" });
    }
};

const addEarningDeductionType = async (req, res) => {
    try {
        const { name, type, allowanceType, description } = req.body;
        const adminId = req.user._id;

        const newType = new EarningDeductionType({
            name,
            type,
            allowanceType: type === 'Earnings' ? allowanceType : 'None',
            description,
            adminId
        });

        await newType.save();
        return res.status(201).json({ success: true, earningDeductionType: newType });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "This name already exists for this type." });
        }
        return res.status(500).json({ success: false, error: "Server Error in adding type" });
    }
};

const updateEarningDeductionType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, allowanceType, description } = req.body;
        const adminId = req.user._id;

        const updatedType = await EarningDeductionType.findOneAndUpdate(
            { _id: id, adminId }, 
            { 
                name, 
                type, 
                allowanceType: type === 'Earnings' ? allowanceType : 'None', 
                description 
            }, 
            { new: true }
        );

        if (!updatedType) {
            return res.status(104).json({ success: false, error: "Type not found" });
        }

        return res.status(200).json({ success: true, earningDeductionType: updatedType });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "This name already exists for this type." });
        }
        return res.status(500).json({ success: false, error: "Server Error in updating type" });
    }
};

const deleteEarningDeductionType = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;
        const deletedType = await EarningDeductionType.findOneAndDelete({ _id: id, adminId });

        if (!deletedType) {
            return res.status(404).json({ success: false, error: "Type not found" });
        }

        return res.status(200).json({ success: true, earningDeductionType: deletedType });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in deleting type" });
    }
};

const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const type = await EarningDeductionType.findOne({ _id: id, adminId });
        if (!type) {
            return res.status(404).json({ success: false, error: "Type not found" });
        }

        type.status = type.status === 'Active' ? 'Inactive' : 'Active';
        await type.save();

        return res.status(200).json({ success: true, earningDeductionType: type });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in toggling status" });
    }
};

export { 
    getEarningDeductionTypes, 
    addEarningDeductionType, 
    updateEarningDeductionType, 
    deleteEarningDeductionType,
    toggleStatus 
};
