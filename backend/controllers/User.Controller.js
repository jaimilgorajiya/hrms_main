import User from "../models/User.Model.js";
import Shift from "../models/Shift.Model.js";
import bcrypt from "bcryptjs";
import { generatePassword, sendWelcomeEmail } from "../utils/emailService.js";
import { generateEmployeeId } from "../utils/employeeId.js";
import DocumentType from "../models/DocumentType.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";

const createUser = async (req, res) => {
    try {
        // Parse complex fields if they are sent as JSON strings via FormData
        const bodyContent = { ...req.body };
        Object.keys(bodyContent).forEach(key => {
            if (typeof bodyContent[key] === 'string' && (bodyContent[key].startsWith('[') || bodyContent[key].startsWith('{'))) {
                try {
                    bodyContent[key] = JSON.parse(bodyContent[key]);
                } catch (e) {
                    // Not valid JSON
                }
            }
        });

        const { emailId, email, firstName, lastName } = bodyContent;
        const targetEmail = emailId || email;
        const adminId = req.user._id;
        
        if (!targetEmail) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // --- ENFORCE EMPLOYEE LIMIT ---
        const Client = (await import('../models/Client.Model.js')).default;
        const client = await Client.findOne({ adminId }).populate('packageId');
        
        if (client) {
            const masterEmail = process.env.MASTER_ADMIN_EMAIL;
            const isMaster = (masterEmail && req.user.email && req.user.email.toLowerCase() === masterEmail.toLowerCase()) || req.user.role === 'Master Admin';
            
            if (!isMaster && !req.isMasterBypass) {
                const baseLimit = client.packageId?.maxEmployees || client.maxEmployees || 0;
                const addonTotal = (client.addonPurchases || [])
                    .reduce((sum, addon) => sum + (addon.employeesAdded || 0), 0);
                const maxAllowed = baseLimit + addonTotal;
                
                const currentEmployeeCount = await User.countDocuments({
                    adminId,
                    role: { $ne: 'Admin' },
                    status: { $in: ['Active', 'Onboarding', 'Resigned'] }
                });
                
                if (currentEmployeeCount >= maxAllowed) {
                    return res.status(403).json({ 
                        success: false, 
                        limitReached: true,
                        message: `You have reached your limit of ${maxAllowed} employees. Please upgrade your plan or purchase an add-on to add more team members.`
                    });
                }
            }
        }
        // ------------------------------

        // Check if user already exists in THIS company
        const existingUser = await User.findOne({ 
            email: targetEmail.trim(),
            adminId: req.user._id
        });
        
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists in your company" });
        }
        
        // Check for existing employee ID in THIS company
        if (bodyContent.employeeId) {
            const idExists = await User.findOne({ 
                employeeId: bodyContent.employeeId.trim(),
                adminId: req.user._id
            });
            if (idExists) {
                return res.status(400).json({ success: false, message: "Employee ID already exists in your company" });
            }
        }

        // Check if phone already exists in THIS company
        if (bodyContent.phone) {
            const phoneExists = await User.findOne({ 
                phone: bodyContent.phone.trim(),
                adminId: req.user._id
            });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: "A user with this phone number already exists in your company" });
            }
        }
        
        // Handle profile photo if uploaded
        let profilePhoto = bodyContent.profilePhoto;
        if (req.file) {
            profilePhoto = req.file.filename;
        } else if (req.files && req.files.profilePhoto) {
            profilePhoto = req.files.profilePhoto[0].filename;
        }

        // Handle documents (Resume, ID Proofs)
        let documents = [];
        
        // Handle multiple ID Proofs if provided
        if (req.files && req.files.idProofs) {
            const types = bodyContent.idProofTypes || [];
            // Handle both array and single string (if only one type sent)
            const typeList = Array.isArray(types) ? types : [types];
            
            for (let i = 0; i < req.files.idProofs.length; i++) {
                const typeName = typeList[i];
                if (typeName) {
                    const docType = await DocumentType.findOne({ name: typeName });
                    if (docType) {
                        documents.push({
                            documentType: docType._id,
                            fileUrl: req.files.idProofs[i].filename,
                            originalName: req.files.idProofs[i].originalname
                        });
                    }
                }
            }
        } else if (req.files && req.files.idProof && bodyContent.idProofType) {
            // Backward compatibility for single idProof field
            const docType = await DocumentType.findOne({ name: bodyContent.idProofType });
            if (docType) {
                documents.push({
                    documentType: docType._id,
                    fileUrl: req.files.idProof[0].filename,
                    originalName: req.files.idProof[0].originalname
                });
            }
        }

        // Attempt to save Resume (Requires a DocumentType named 'Resume' to exist)
        if (req.files && req.files.resume) {
            let docType = await DocumentType.findOne({ name: 'Resume', adminId: req.user._id });
            if (!docType) {
                // Optionally create it on the fly if it doesn't exist
                docType = new DocumentType({ name: 'Resume', adminId: req.user._id, status: true });
                await docType.save();
            }
            if (docType) {
                documents.push({
                    documentType: docType._id,
                    fileUrl: req.files.resume[0].filename,
                    originalName: req.files.resume[0].originalname
                });
            }
        }

        // Generate employee ID if not provided
        let employeeId = bodyContent.employeeId;
        if (!employeeId || employeeId.trim() === '') {
            employeeId = await generateEmployeeId(req.user._id);
        }

        // Generate random password
        const temporaryPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Construct full name
        const name = `${firstName || ''} ${lastName || ''}`.trim() || bodyContent.name || 'Unnamed User';

        // Handle Shift resolution if shift name is provided
        let shiftId = null;
        if (bodyContent.shift) {
            const shiftObj = await Shift.findOne({ shiftName: bodyContent.shift });
            if (shiftObj) shiftId = shiftObj._id;
        }

        // Create new user with all fields, mapping as necessary
        const newUser = new User({
            ...bodyContent,
            email: targetEmail.trim(),
            dateJoined: bodyContent.dateOfJoining || bodyContent.dateJoined,
            workSetup: {
                ...(bodyContent.workSetup || {}),
                location: bodyContent.jobLocation || bodyContent.branch || (bodyContent.workSetup ? bodyContent.workSetup.location : ''),
                shift: shiftId || (bodyContent.workSetup ? bodyContent.workSetup.shift : null),
                salaryGroup: bodyContent.salaryGroup || (bodyContent.workSetup ? bodyContent.workSetup.salaryGroup : null)
            },
            profilePhoto,
            name,
            employeeId,
            documents,
            password: hashedPassword,
            forcePasswordReset: true,
            adminId: req.user._id,
            status: bodyContent.status || 'Active'
        });

        await newUser.save();

        // Create Onboarding record if status is Onboarding or Active
        if (newUser.status === 'Onboarding' || newUser.status === 'Active') {
            const Onboarding = (await import('../models/Onboarding.Model.js')).default;
            await Onboarding.create({
                userId: newUser._id,
                joiningDate: newUser.dateJoined,
                status: newUser.status === 'Active' ? 'Completed' : 'Pre-Boarding'
            });
        }
        
        // Send welcome email with credentials
        const emailResult = await sendWelcomeEmail(targetEmail, name, employeeId, temporaryPassword);
        
        // Return user without password
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({ 
            success: true, 
            message: emailResult.success 
                ? "User created successfully and welcome email sent" 
                : "User created successfully but email failed to send",
            user: userResponse,
            emailSent: emailResult.success
        });
    } catch (error) {
        console.error("Error in createUser controller:", error);
        
        // Handle duplicate key errors (code 11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                success: false, 
                message: `Duplicate field error: A user with this ${field} already exists.` 
            });
        }

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: `Validation error: ${messages.join(', ')}` 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error during employee creation",
            error: error.message 
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const adminId = req.user._id;
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Inclusion of full current day

        const users = await User.find({ 
            role: { $ne: 'Admin' },
            adminId,
            $and: [
                {
                    $or: [
                        { status: { $in: ['Active', 'Inactive', 'Onboarding'] } },
                        { 
                            status: 'Resigned', 
                            $or: [
                                { exitDate: { $gt: today } },
                                { exitDate: { $exists: false } },
                                { exitDate: null }
                            ]
                        }
                    ]
                }
            ]
        })
        .populate('workSetup.shift')
        .populate('leaveGroup')
        .populate('workSetup.salaryGroup')
        .select("-password")
        .sort({ createdAt: -1 });

        const processedUsers = await Promise.all(users.map(async user => {
            const userObj = user.toObject();
            if (userObj.workSetup && userObj.workSetup.shift) {
                userObj.shift = userObj.workSetup.shift.shiftName;
            }
            if (userObj.workSetup && userObj.workSetup.salaryGroup) {
                userObj.salaryGroupId = userObj.workSetup.salaryGroup._id || userObj.workSetup.salaryGroup;
            }

            // check punch status for today
            const istNow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
            const todayStr = istNow.toISOString().split('T')[0];
            const attendance = await Attendance.findOne({ employee: user._id, date: todayStr });
            userObj.isPunchedIn = attendance?.punches?.[attendance.punches.length - 1]?.type === 'IN';

            return userObj;
        }));

        res.status(200).json({ success: true, users: processedUsers });
    } catch (error) {
        console.log("Error in getUsers controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getExEmployees = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const adminId = req.user._id;
        const users = await User.find({ 
            role: { $ne: 'Admin' },
            adminId,
            $and: [
                {
                    $or: [
                        { status: { $in: ['Ex-Employee', 'Terminated', 'Absconding', 'Retired'] } },
                        { 
                            status: 'Resigned', 
                            exitDate: { $lte: today } 
                        }
                    ]
                }
            ]
        })
        .populate('workSetup.shift')
        .select("-password")
        .sort({ exitDate: -1 });

        res.status(200).json({ success: true, users });
    } catch (error) {
        console.log("Error in getExEmployees controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('workSetup.shift')
            .populate('leaveGroup')
            .populate('workSetup.salaryGroup')
            .populate('documents.documentType')
            .select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Auto-transition status if notice period is completed
        if (user.status === 'Resigned' && user.exitDate && new Date(user.exitDate) <= new Date()) {
            user.status = 'Ex-Employee';
            await user.save();
        }

        // Add top-level shift field for frontend compatibility
        const userObj = user.toObject();
        if (userObj.workSetup && userObj.workSetup.shift) {
            userObj.shift = userObj.workSetup.shift.shiftName;
        }
        if (userObj.workSetup && userObj.workSetup.salaryGroup) {
            userObj.salaryGroupId = userObj.workSetup.salaryGroup._id || userObj.workSetup.salaryGroup;
        }

        res.status(200).json({ success: true, user: userObj });
    } catch (error) {
        console.log("Error in getUser controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateUser = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Handle password update separately if provided
        if (updateData.password && updateData.password.trim() !== '') {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        } else {
            delete updateData.password;
        }

        // Handle profile photo update
        // Map alternative field names if necessary (matching createUser logic)
        if (updateData.dateOfJoining && !updateData.dateJoined) {
            updateData.dateJoined = updateData.dateOfJoining;
        }

        // Handle profile photo update
        if (req.file) {
            updateData.profilePhoto = req.file.filename;
        } else if (updateData.profilePhoto === 'null') {
             // Handle case where photo might be explicitly cleared
             updateData.profilePhoto = null;
        }
        
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ success: false, message: "User not found" });

        // Merge workSetup if it was sent as an object or partial fields
        const workSetup = { ...(userToUpdate.workSetup || {}) };
        
        // Handle nested fields that might have been sent as strings from FormData
        delete updateData._id;
        delete updateData.__v;

        // Try to parse JSON strings and handle special values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === '[object Object]' || updateData[key] === 'undefined' || updateData[key] === 'null') {
                delete updateData[key];
                return;
            }
            if (typeof updateData[key] === 'string' && (updateData[key].startsWith('[') || updateData[key].startsWith('{'))) {
                try { updateData[key] = JSON.parse(updateData[key]); } catch (e) {}
            }
        });

        if (updateData.workSetup && typeof updateData.workSetup === 'object') {
            Object.assign(workSetup, updateData.workSetup);
        }

        // Apply special mappings
        if (updateData.shift) {
            const shiftObj = await Shift.findOne({ shiftName: updateData.shift });
            if (shiftObj) workSetup.shift = shiftObj._id;
        }
        if (updateData.salaryGroup !== undefined) {
            workSetup.salaryGroup = updateData.salaryGroup === '' ? null : updateData.salaryGroup;
        }
        if (updateData.branch) {
            workSetup.location = updateData.branch;
        }

        updateData.workSetup = workSetup;

        // Clean up root fields that were mapped to workSetup
        delete updateData.shift;
        delete updateData.salaryGroup;

        // Update name if firstName or lastName changed
        if (updateData.firstName || updateData.lastName) {
            const firstName = updateData.firstName || userToUpdate.firstName || '';
            const lastName = updateData.lastName || userToUpdate.lastName || '';
            updateData.name = `${firstName} ${lastName}`.trim();
        }

        // Convert empty string leaveGroup to null
        if (updateData.leaveGroup === "") updateData.leaveGroup = null;

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        ).select("-password").populate('workSetup.shift').populate('leaveGroup').populate('workSetup.salaryGroup');

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Add top-level shift field for frontend compatibility
        const userObj = user.toObject();
        if (userObj.workSetup && userObj.workSetup.shift) {
            userObj.shift = userObj.workSetup.shift.shiftName;
        }
        if (userObj.workSetup && userObj.workSetup.salaryGroup) {
            userObj.salaryGroupId = userObj.workSetup.salaryGroup._id || userObj.workSetup.salaryGroup;
        }

        res.status(200).json({ success: true, message: "User updated successfully", user: userObj });
    } catch (error) {
        console.log("Error in updateUser controller", error.message);
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                success: false, 
                message: `A user with this ${field} already exists` 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error during profile update", 
            error: error.message 
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.log("Error in deleteUser controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const reactivateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Update user status
        user.status = 'Active';
        user.exitDate = undefined;
        user.resignationDate = undefined;
        user.exitReason = undefined;
        await user.save();

        // Cleanup associated records (Optional but recommended)
        const ExitRecord = (await import('../models/ExitRecord.Model.js')).default;
        const Resignation = (await import('../models/Resignation.Model.js')).default;
        
        await ExitRecord.findOneAndDelete({ userId: id });
        await Resignation.findOneAndDelete({ employeeId: id });

        res.status(200).json({ 
            success: true, 
            message: `Employee ${user.name} has been successfully reactivated.`,
            user 
        });
    } catch (error) {
        console.error("Error in reactivateUser controller:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const getNextEmployeeId = async (req, res) => {
    try {
        const nextId = await generateEmployeeId(req.user._id);
        res.status(200).json({ success: true, nextId });
    } catch (error) {
        console.log("Error in getNextEmployeeId controller", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const bulkUpdateEmployeeIds = async (req, res) => {
    try {
        const { updates } = req.body; // [{ id, employeeId }]
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: "No updates provided" });
        }

        const results = { success: 0, failed: [] };
        for (const { id, employeeId } of updates) {
            if (!employeeId || !employeeId.trim()) {
                results.failed.push({ id, reason: 'Empty employee ID' });
                continue;
            }
            // Check for duplicate scoped to the current tenant (adminId)
            const existing = await User.findOne({ employeeId: employeeId.trim(), _id: { $ne: id }, adminId: req.user._id });
            if (existing) {
                results.failed.push({ id, reason: `ID "${employeeId}" already in use` });
                continue;
            }
            // Ensure the user actually belongs to this tenant
            const updated = await User.findOneAndUpdate({ _id: id, adminId: req.user._id }, { employeeId: employeeId.trim() });
            if (!updated) {
                results.failed.push({ id, reason: `User not found or access denied` });
                continue;
            }
            results.success++;
        }

        res.status(200).json({ success: true, message: `${results.success} updated, ${results.failed.length} failed`, results });
    } catch (error) {
        console.log("Error in bulkUpdateEmployeeIds", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const uploadUserDocument = async (req, res) => {
    try {
        const { documentType, documentNumber, issueDate, expiryDate } = req.body;
        const file = req.file;

        if (!documentType || !file) {
            return res.status(400).json({ success: false, message: "Document type and file are required" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const newDoc = {
            documentType,
            fileUrl: file.filename,
            originalName: file.originalname,
            documentNumber,
            issueDate: issueDate || null,
            expiryDate: expiryDate || null
        };

        user.documents.push(newDoc);
        await user.save();

        const populatedUser = await User.findById(req.params.id)
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup')
            .populate('documents.documentType')
            .select("-password");
        
        res.status(200).json({ success: true, message: "Document uploaded successfully", user: populatedUser });
    } catch (error) {
        console.error("Error in uploadUserDocument:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const deleteUserDocument = async (req, res) => {
    try {
        const { id, docId } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        user.documents = user.documents.filter(doc => doc._id.toString() !== docId);
        await user.save();
        
        const populatedUser = await User.findById(req.params.id)
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup')
            .populate('documents.documentType')
            .select("-password");
            
        res.status(200).json({ success: true, message: "Document deleted successfully", user: populatedUser });
    } catch (error) {
        console.error("Error in deleteUserDocument:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const changeBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { branch, department } = req.body;

        if (!branch) {
            return res.status(400).json({ success: false, message: "Branch is required" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        user.branch = branch;
        if (department) {
            user.department = department;
        }

        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `Employee ${user.name} has been successfully moved to ${branch} branch.`,
            user: {
                _id: user._id,
                name: user.name,
                branch: user.branch,
                department: user.department
            }
        });
    } catch (error) {
        console.error("Error in changeBranch controller:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const getLeaveBalances = async (req, res) => {
    try {
        const users = await User.find({ status: { $ne: "Ex-Employee" }, role: { $ne: "Admin" }, adminId: req.user._id })
            .populate('leaveGroup')
            .select('name employeeId leaveGroup noOfPaidLeaves');

        const balances = await Promise.all(users.map(async (user) => {
            // Calculate Entitlement
            let entitlement = Number(user.noOfPaidLeaves || user.leaveGroup?.noOfPaidLeaves || 0);
            
            // Calculate Used Leaves
            // We need to count days between fromDate and toDate for each approved request
            const approvedRequests = await Request.find({
                employee: user._id,
                requestType: 'Leave',
                status: 'Approved',
                leaveCategory: 'Paid'
            });

            let used = 0;
            approvedRequests.forEach(req => {
                const start = new Date(req.fromDate);
                const end = new Date(req.toDate);
                // Difference in days + 1
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                if (req.leaveDuration === "Full Day") {
                    used += diffDays;
                } else {
                    // Half day is always on a single date, so diffDays is 1
                    used += 0.5;
                }
            });

            return {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                leaveGroup: user.leaveGroup?.leaveGroupName || "None",
                totalEntitlement: entitlement,
                used: used,
                balance: entitlement - used
            };
        }));

        res.status(200).json({ success: true, balances });
    } catch (error) {
        console.error("Error in getLeaveBalances:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, isActive } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (status) user.status = status;
        if (isActive !== undefined) {
            user.status = isActive ? "Active" : "Inactive";
        }
        await user.save();

        // Also update the associated company if it exists
        const Company = (await import('../models/Company.Model.js')).default;
        const company = await Company.findOne({ adminId: id });
        if (company) {
            company.isActive = user.status === "Active";
            await company.save();
        }

        res.status(200).json({ success: true, message: `User status updated to ${user.status}`, user });
    } catch (error) {
        console.error("Error in updateUserStatus:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteProfilePhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.profilePhoto = null;
        await user.save();

        res.status(200).json({ success: true, message: "Profile photo removed successfully", user });
    } catch (error) {
        console.error("Error in deleteProfilePhoto:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getAllUploadedDocuments = async (req, res) => {
    try {
        const adminId = req.user._id;
        const users = await User.find({ adminId })
            .populate('documents.documentType')
            .select('name employeeId branch department documents');

        let allDocs = [];
        users.forEach(user => {
            if (user.documents && user.documents.length > 0) {
                user.documents.forEach(doc => {
                    allDocs.push({
                        _id: doc._id,
                        employeeId: user._id,
                        employeeName: user.name,
                        employeeCode: user.employeeId,
                        branch: user.branch,
                        department: user.department,
                        documentType: doc.documentType?.name || 'Unknown Type',
                        originalName: doc.originalName || doc.fileUrl,
                        fileUrl: doc.fileUrl,
                        documentNumber: doc.documentNumber,
                        issueDate: doc.issueDate,
                        expiryDate: doc.expiryDate,
                        uploadedAt: doc.uploadedAt,
                        status: doc.status || 'Pending',
                        rejectionReason: doc.rejectionReason || ''
                    });
                });
            }
        });

        allDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        res.status(200).json({ success: true, documents: allDocs });
    } catch (error) {
        console.error("Error in getAllUploadedDocuments:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const reviewUserDocument = async (req, res) => {
    try {
        const { id: userId, docId } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const doc = user.documents.id(docId);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }

        doc.status = status;
        if (status === 'Rejected') {
            doc.rejectionReason = rejectionReason || '';
        } else {
            doc.rejectionReason = undefined;
        }

        await user.save();
        res.status(200).json({ success: true, message: `Document status updated to ${status}` });
    } catch (error) {
        console.error("Error in reviewUserDocument:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const resendCredentials = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Generate new temporary password
        const temporaryPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        user.password = hashedPassword;
        user.forcePasswordReset = true;
        await user.save();

        // Send welcome email with credentials
        const emailResult = await sendWelcomeEmail(user.email, user.name, user.employeeId, temporaryPassword);

        res.status(200).json({ 
            success: true, 
            message: emailResult.success 
                ? "Credentials sent successfully to employee's email" 
                : "New credentials saved, but email failed to send",
            emailSent: emailResult.success
        });
    } catch (error) {
        console.error("Error in resendCredentials controller:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const sendAllCredentials = async (req, res) => {
    try {
        const adminId = req.user._id;
        const users = await User.find({
            role: { $ne: 'Admin' },
            adminId,
            status: { $in: ['Active', 'Onboarding'] }
        });

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "No active or onboarding employees found to send credentials." });
        }

        // Send all concurrently and collect outcomes
        const results = await Promise.allSettled(users.map(async (user) => {
            const temporaryPassword = generatePassword();
            const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

            user.password = hashedPassword;
            user.forcePasswordReset = true;
            await user.save();

            const emailResult = await sendWelcomeEmail(user.email, user.name, user.employeeId, temporaryPassword);
            if (!emailResult.success) {
                throw new Error(emailResult.error || "Email failed to send");
            }
            return user.email;
        }));

        let successCount = 0;
        let failCount = 0;
        results.forEach(r => {
            if (r.status === 'fulfilled') {
                successCount++;
            } else {
                failCount++;
                console.error("Failed to send credentials for an employee:", r.reason);
            }
        });

        res.status(200).json({
            success: true,
            message: `Credentials sent successfully to ${successCount} employees.${failCount > 0 ? ` Failed for ${failCount} employees.` : ''}`,
            details: { successCount, failCount }
        });
    } catch (error) {
        console.error("Error in sendAllCredentials controller:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

export { createUser, getUsers, getExEmployees, getUser, updateUser, deleteUser, reactivateUser, getNextEmployeeId, bulkUpdateEmployeeIds, uploadUserDocument, deleteUserDocument, changeBranch, getLeaveBalances, updateUserStatus, deleteProfilePhoto, getAllUploadedDocuments, reviewUserDocument, resendCredentials, sendAllCredentials };

