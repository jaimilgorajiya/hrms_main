import User from "../models/User.Model.js";
import Branch from "../models/Branch.Model.js";
import Department from "../models/Department.Model.js";
import Designation from "../models/Designation.Model.js";
import Shift from "../models/Shift.Model.js";
import LeaveGroup from "../models/LeaveGroup.Model.js";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { generatePassword, sendWelcomeEmail } from "../utils/emailService.js";
import { generateEmployeeId } from "../utils/employeeId.js";

const downloadSample = (req, res) => {
    const data = [
        {
            "Employee ID": "EMP001",
            "First Name": "John",
            "Last Name": "Doe",
            "Email": "john.doe@example.com",
            "Phone": "9876543210",
            "Country Code": "+91",
            "Gender": "Male",
            "Date of Birth (YYYY-MM-DD)": "1990-01-01",
            "Date of Joining (YYYY-MM-DD)": "2023-01-01",
            "Designation": "Software Engineer",
            "Department": "IT",
            "Branch": "Main Branch",
            "Employment Type": "Full Time",
            "Shift": "General Shift",
            "Leave Group": "Standard Leave Group"
        }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=employee_import_sample.xlsx");
    res.send(buffer);
};

const importEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        let buffer;
        if (req.file.buffer) {
            buffer = req.file.buffer;
        } else if (req.file.path) {
            const fs = await import('fs');
            buffer = fs.readFileSync(req.file.path);
            // Optionally delete the file after reading
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }

        if (!buffer) {
            return res.status(400).json({ success: false, message: "File processing failed" });
        }

        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        const adminId = req.user._id;

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Get current limit info
        const Client = (await import('../models/Client.Model.js')).default;
        const client = await Client.findOne({ adminId }).populate('packageId');
        
        let maxAllowed = 999999;
        const masterEmail = process.env.MASTER_ADMIN_EMAIL;
        const isMaster = (masterEmail && req.user.email && req.user.email.toLowerCase() === masterEmail.toLowerCase()) || req.user.role === 'Master Admin';
        
        if (client && !isMaster && !req.isMasterBypass) {
            const baseLimit = client.packageId?.maxEmployees || client.maxEmployees || 0;
            const addonTotal = (client.addonPurchases || [])
                .reduce((sum, addon) => sum + (addon.employeesAdded || 0), 0);
            maxAllowed = baseLimit + addonTotal;
        }

        let currentEmployeeCount = await User.countDocuments({
            adminId,
            role: { $ne: 'Admin' },
            status: { $in: ['Active', 'Onboarding', 'Resigned'] }
        });

        for (const row of data) {
            // Check if limit reached during import
            if (currentEmployeeCount >= maxAllowed) {
                results.failed++;
                results.errors.push(`Row ${results.success + results.failed + 1}: Limit of ${maxAllowed} employees reached. Purchase add-ons to add more.`);
                continue;
            }
            try {
                const email = row["Email"]?.toString().trim().toLowerCase();
                const firstName = row["First Name"]?.toString().trim();
                const lastName = row["Last Name"]?.toString().trim();
                const phone = row["Phone"]?.toString().trim();
                const countryCode = row["Country Code"]?.toString().trim() || "+91";
                const employeeIdInput = row["Employee ID"]?.toString().trim();
                const designationName = row["Designation"]?.toString().trim();
                const departmentName = row["Department"]?.toString().trim();
                const branchName = row["Branch"]?.toString().trim();
                const shiftName = row["Shift"]?.toString().trim();
                const leaveGroupName = row["Leave Group"]?.toString().trim();
                const dob = row["Date of Birth (YYYY-MM-DD)"];
                const doj = row["Date of Joining (YYYY-MM-DD)"];
                const gender = row["Gender"]?.toString().trim() || "Male";
                const employmentType = row["Employment Type"]?.toString().trim() || "Full Time";

                if (!email || !firstName) {
                    results.failed++;
                    results.errors.push(`Row ${results.success + results.failed + 1}: Email and First Name are required`);
                    continue;
                }

                // Check for existing user within this Admin's company
                const existingUser = await User.findOne({ 
                    $or: [
                        { email, adminId: req.user._id },
                        { phone, adminId: req.user._id },
                        { employeeId: employeeIdInput, adminId: req.user._id }
                    ].filter(q => q.email || q.phone || q.employeeId) // Filter out empty fields
                });

                if (existingUser) {
                    let conflict = "User";
                    if (existingUser.email === email) conflict = "Email";
                    else if (existingUser.phone === phone) conflict = "Phone number";
                    else if (existingUser.employeeId === employeeIdInput) conflict = "Employee ID";
                    
                    results.failed++;
                    results.errors.push(`${email}: ${conflict} already exists in your company`);
                    continue;
                }

                // Auto-create Branch if needed
                let branchId = null;
                if (branchName) {
                    let branch = await Branch.findOne({ branchName, adminId: req.user._id });
                    if (!branch) {
                        branch = await Branch.create({
                            branchName,
                            branchType: "Non-Metro city",
                            adminId: req.user._id
                        });
                    }
                    branchId = branch._id;
                } else if (departmentName) {
                    // If department is provided but no branch, try to find any existing branch or create a default one
                    let branch = await Branch.findOne({ adminId: req.user._id });
                    if (!branch) {
                        branch = await Branch.create({
                            branchName: "Default Branch",
                            branchType: "Non-Metro city",
                            adminId: req.user._id
                        });
                    }
                    branchId = branch._id;
                }

                // Auto-create Department if needed
                if (departmentName && branchId) {
                    let department = await Department.findOne({ name: departmentName, branchId, adminId: req.user._id });
                    if (!department) {
                        department = await Department.create({
                            name: departmentName,
                            branchId,
                            adminId: req.user._id
                        });
                    }
                }

                // Auto-create Designation if needed
                if (designationName) {
                    let designation = await Designation.findOne({ designationName, adminId: req.user._id });
                    if (!designation) {
                        const count = await Designation.countDocuments({ adminId: req.user._id });
                        designation = await Designation.create({
                            designationName,
                            designationCode: `DESG${count + 1}`,
                            adminId: req.user._id
                        });
                    }
                }

                // Resolve Shift
                let shiftId = null;
                if (shiftName) {
                    const shift = await Shift.findOne({ shiftName, adminId: req.user._id });
                    if (shift) shiftId = shift._id;
                }

                // Resolve or Auto-create Leave Group
                let leaveGroupId = null;
                if (leaveGroupName) {
                    let lg = await LeaveGroup.findOne({ leaveGroupName, adminId: req.user._id });
                    if (!lg) {
                        lg = await LeaveGroup.create({
                            leaveGroupName,
                            adminId: req.user._id
                        });
                    }
                    leaveGroupId = lg._id;
                } else {
                    // Try to find any existing leave group for this admin
                    const lg = await LeaveGroup.findOne({ adminId: req.user._id });
                    if (lg) leaveGroupId = lg._id;
                }

                // Generate employee ID if not provided
                let employeeId = employeeIdInput;
                if (!employeeId) {
                    employeeId = await generateEmployeeId(req.user._id);
                }

                // Generate random password
                const temporaryPassword = generatePassword();
                const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

                const newUser = new User({
                    name: `${firstName} ${lastName || ''}`.trim(),
                    firstName,
                    lastName,
                    email,
                    phone,
                    countryCode,
                    employeeId,
                    designation: designationName,
                    department: departmentName,
                    branch: branchName,
                    dateOfBirth: dob ? new Date(dob) : null,
                    dateJoined: doj ? new Date(doj) : new Date(),
                    gender,
                    employmentType,
                    password: hashedPassword,
                    forcePasswordReset: true,
                    adminId: req.user._id,
                    status: 'Active',
                    leaveGroup: leaveGroupId,
                    workSetup: {
                        location: branchName || '',
                        shift: shiftId
                    }
                });

                await newUser.save();
                currentEmployeeCount++;
                
                // Send welcome email
                try {
                    await sendWelcomeEmail(email, newUser.name, employeeId, temporaryPassword);
                } catch (e) {
                    console.error("Failed to send welcome email to", email);
                }

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Row ${results.success + results.failed + 1}: ${err.message}`);
            }
        }

        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error("Import error:", error);
        res.status(500).json({ success: false, message: "Internal server error during import" });
    }
};

export { downloadSample, importEmployees };
