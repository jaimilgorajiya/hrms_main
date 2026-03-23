import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
    roleName: {
        type: String,
        required: [true, "Role name is required"],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    permissions: [{
        module: String,
        subModule: String,
        childModule: String,
        access: {
            type: Boolean,
            default: true
        }
    }],
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the Admin/User who created it
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Role = mongoose.model("Role", roleSchema);

export default Role;