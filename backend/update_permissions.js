import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from './config/db.js';

const managementRoleSchema = new mongoose.Schema({
    roleName: String,
    permissions: [{
        module: String,
        subModule: String,
        childModule: String,
        access: Boolean
    }]
}, { strict: false });

const ManagementRole = mongoose.model('ManagementRole', managementRoleSchema);

const updatePermissions = async () => {
    await connectDB();
    console.log("Updating management role permissions for History...");

    const newPermissions = [
        { module: "Core HRMS", subModule: "Payroll", childModule: "Generate Salary Slip", access: true },
        { module: "Core HRMS", subModule: "Payroll", childModule: "Publish Salary Slip", access: true },
        { module: "Core HRMS", subModule: "Payroll", childModule: "Payroll History", access: true }
    ];

    const roles = await ManagementRole.find({});
    for (const role of roles) {
        let updated = false;
        
        for (const newP of newPermissions) {
            const exists = role.permissions.some(p => 
                p.module === newP.module && 
                p.subModule === newP.subModule && 
                p.childModule === newP.childModule
            );
            
            if (!exists) {
                role.permissions.push(newP);
                updated = true;
            } else {
                // Force true for existing ones too
                const p = role.permissions.find(p => 
                    p.module === newP.module && 
                    p.subModule === newP.subModule && 
                    p.childModule === newP.childModule
                );
                if (!p.access) {
                    p.access = true;
                    updated = true;
                }
            }
        }

        if (updated) {
            await role.save();
            console.log(`Updated role: ${role.roleName}`);
        }
    }

    console.log("Permissions updated successfully.");
    process.exit(0);
};

updatePermissions();
