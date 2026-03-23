import Designation from "../models/Designation.Model.js";

const getDesignations = async (req, res) => {
    try {
        const adminId = req.user._id;
        const designations = await Designation.find({ adminId }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, designations });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in fetching designations" });
    }
};

const addDesignation = async (req, res) => {
    try {
        const { designationName, designationAlias, jobDescription } = req.body;
        const adminId = req.user._id;

        // Generate next code by finding all existing codes for this admin and taking the maximum number
        const designations = await Designation.find({ adminId }, { designationCode: 1 });
        let nextNumber = 1;
        if (designations.length > 0) {
            const codes = designations.map(d => {
                const match = (d.designationCode || "").match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            });
            nextNumber = Math.max(...codes) + 1;
        }
        const designationCode = `D${nextNumber}`;

        const newDesignation = new Designation({
            designationCode,
            designationName,
            designationAlias,
            jobDescription,
            adminId
        });

        await newDesignation.save();
        return res.status(201).json({ success: true, designation: newDesignation });
    } catch (error) {
        if (error.code === 11000) {
            // Get the field that triggered the duplicate error
            const duplicateField = Object.keys(error.keyPattern).join(', ');
            let userFriendlyMessage = "This entry is already in use.";
            
            if (duplicateField.includes('designationName')) {
                userFriendlyMessage = "This designation name is already in use by another record.";
            } else if (duplicateField.includes('designationCode')) {
                userFriendlyMessage = "This designation code is already in use.";
            }

            return res.status(400).json({ 
                success: false, 
                error: userFriendlyMessage 
            });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(500).json({ success: false, error: "Internal Server Error in adding designation" });
    }
};

const updateDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const { designationName, designationAlias, jobDescription } = req.body;
        const adminId = req.user._id;

        const updatedDesignation = await Designation.findOneAndUpdate(
            { _id: id, adminId }, 
            { designationName, designationAlias, jobDescription }, 
            { new: true }
        );

        if (!updatedDesignation) {
            return res.status(404).json({ success: false, error: "Designation not found" });
        }

        return res.status(200).json({ success: true, designation: updatedDesignation });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in updating designation" });
    }
};

const deleteDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;
        const deletedDesignation = await Designation.findOneAndDelete({ _id: id, adminId });

        if (!deletedDesignation) {
            return res.status(404).json({ success: false, error: "Designation not found" });
        }

        return res.status(200).json({ success: true, designation: deletedDesignation });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in deleting designation" });
    }
};

export { addDesignation, getDesignations, updateDesignation, deleteDesignation };
