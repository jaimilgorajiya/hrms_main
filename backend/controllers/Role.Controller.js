import Role from "../models/Role.Model.js";

export const createRole = async (req, res) => {
    try {
        const { roleName, description, permissions } = req.body;
        const adminId = req.user._id; // From auth middleware

        if (!roleName) {
            return res.status(400).json({ success: false, message: "Role name is required" });
        }

        const role = new Role({
            roleName,
            description,
            permissions,
            admin: adminId
        });

        await role.save();
        res.status(201).json({ success: true, message: "Role created successfully", role });
    } catch (error) {
        console.error("Error creating role:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getRoles = async (req, res) => {
    try {
        const adminId = req.user._id;
        const roles = await Role.find({ admin: adminId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, roles });
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getRoleById = async (req, res) => {
    try {
        const adminId = req.user._id;
        const role = await Role.findOne({ _id: req.params.id, admin: adminId });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }
        res.status(200).json({ success: true, role });
    } catch (error) {
        console.error("Error fetching role by id:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateRole = async (req, res) => {
    try {
        const { roleName, description, permissions, isActive } = req.body;
        const adminId = req.user._id;
        const role = await Role.findOneAndUpdate(
            { _id: req.params.id, admin: adminId },
            { roleName, description, permissions, isActive },
            { new: true, runValidators: true }
        );

        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }

        res.status(200).json({ success: true, message: "Role updated successfully", role });
    } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const deleteRole = async (req, res) => {
    try {
        const adminId = req.user._id;
        const role = await Role.findOneAndDelete({ _id: req.params.id, admin: adminId });
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }
        res.status(200).json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
        console.error("Error deleting role:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
