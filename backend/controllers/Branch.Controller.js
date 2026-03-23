import Branch from "../models/Branch.Model.js";

const getBranches = async (req, res) => {
    try {
        const adminId = req.user._id;
        const branches = await Branch.find({ adminId }).sort({ order: 1, createdAt: -1 });
        return res.status(200).json({ success: true, branches });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in fetching branches" });
    }
};

const addBranch = async (req, res) => {
    try {
        const { branchName, branchCode, branchType } = req.body;
        const adminId = req.user._id;

        const branchesCount = await Branch.countDocuments({ adminId });

        const newBranch = new Branch({
            branchName,
            branchCode,
            branchType,
            adminId,
            order: branchesCount
        });

        await newBranch.save();
        return res.status(201).json({ success: true, branch: newBranch });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "Branch name already exists in your company." });
        }
        return res.status(500).json({ success: false, error: "Server Error in adding branch" });
    }
};

const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { branchName, branchCode, branchType } = req.body;
        const adminId = req.user._id;

        const updatedBranch = await Branch.findOneAndUpdate(
            { _id: id, adminId }, 
            { branchName, branchCode, branchType }, 
            { new: true }
        );

        if (!updatedBranch) {
            return res.status(404).json({ success: false, error: "Branch not found" });
        }

        return res.status(200).json({ success: true, branch: updatedBranch });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "Branch name already exists in your company." });
        }
        return res.status(500).json({ success: false, error: "Server Error in updating branch" });
    }
};

const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;
        const deletedBranch = await Branch.findOneAndDelete({ _id: id, adminId });

        if (!deletedBranch) {
            return res.status(404).json({ success: false, error: "Branch not found" });
        }

        return res.status(200).json({ success: true, branch: deletedBranch });
    } catch (error) {
        return res.status(500).json({ success: false, error: "Server Error in deleting branch" });
    }
};

const reorderBranches = async (req, res) => {
    try {
        const { reorderedBranches } = req.body; // Array of { _id, order }
        const adminId = req.user._id;

        if (!reorderedBranches || !Array.isArray(reorderedBranches)) {
            return res.status(400).json({ success: false, error: "Invalid data format" });
        }

        const bulkOps = reorderedBranches.map((item, index) => ({
            updateOne: {
                filter: { _id: item._id, adminId },
                update: { $set: { order: index } }
            }
        }));

        await Branch.bulkWrite(bulkOps);

        return res.status(200).json({ success: true, message: "Order updated successfully" });
    } catch (error) {
        console.error("Reorder Error:", error);
        return res.status(500).json({ success: false, error: "Server Error in reordering branches" });
    }
};

export { getBranches, addBranch, updateBranch, deleteBranch, reorderBranches };
