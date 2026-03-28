import User from "../models/User.Model.js";
import Shift from "../models/Shift.Model.js";
import bcrypt from "bcryptjs";
import { generatePassword, sendWelcomeEmail } from "../utils/emailService.js";
import { generateEmployeeId } from "../utils/employeeId.js";
import DocumentType from "../models/DocumentType.Model.js";
import Attendance from "../models/Attendance.Model.js";

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
        
        if (!targetEmail) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // Check if user already exists
        console.log('Checking email:', targetEmail);
        console.log('Trimmed email:', targetEmail.trim());
        
        // Let MongoDB handle the lowercase conversion via the model schema
        const existingUser = await User.findOne({ 
            email: targetEmail.trim() 
        });
        console.log('Existing user found:', existingUser ? 'YES' : 'NO');
        if (existingUser) {
            console.log('Existing user email:', existingUser.email);
        }
        
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists" });
        }

        // Check if phone already exists
        if (bodyContent.phone) {
            const phoneExists = await User.findOne({ 
                phone: bodyContent.phone.trim() 
            });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: "A user with this phone number already exists" });
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
                location: bodyContent.jobLocation || bodyContent.branch || (bodyContent.workSetup ? bodyContent.workSetup.location : ''),
                shift: shiftId
            },
            profilePhoto,
            name,
            employeeId,
            documents,
            password: hashedPassword,
            forcePasswordReset: true,
            adminId: req.user._id
        });

        await newUser.save();
        
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
            $and: [
                {
                    $or: [
                        { adminId },
                        { adminId: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { status: { $in: ['Active', 'Inactive', 'Onboarding'] } },
                        { 
                            status: 'Resigned', 
                            exitDate: { $gt: today } 
                        }
                    ]
                }
            ]
        })
        .populate('workSetup.shift')
        .populate('leaveGroup')
        .select("-password")
        .sort({ createdAt: -1 });

        const processedUsers = await Promise.all(users.map(async user => {
            const userObj = user.toObject();
            if (userObj.workSetup && userObj.workSetup.shift) {
                userObj.shift = userObj.workSetup.shift.shiftName;
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
            $and: [
                {
                    $or: [
                        { adminId },
                        { adminId: { $exists: false } }
                    ]
                },
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
            .populate('documents.documentType')
            .select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Add top-level shift field for frontend compatibility
        const userObj = user.toObject();
        if (userObj.workSetup && userObj.workSetup.shift) {
            userObj.shift = userObj.workSetup.shift.shiftName;
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
        
        // Handle Shift update if provided as name
        if (updateData.shift) {
            const shiftObj = await Shift.findOne({ shiftName: updateData.shift });
            if (shiftObj) {
                updateData['workSetup.shift'] = shiftObj._id;
            }
            delete updateData.shift; // Remove root field as it's not in schema
        }

        // Handle Branch/Location update
        if (updateData.branch) {
            updateData['workSetup.location'] = updateData.branch;
            // Note: keeping root 'branch' as it exists in schema too
        }

        // Update name if firstName or lastName changed
        if (updateData.firstName || updateData.lastName) {
            const userForName = await User.findById(req.params.id);
            const firstName = updateData.firstName || userForName.firstName || '';
            const lastName = updateData.lastName || userForName.lastName || '';
            updateData.name = `${firstName} ${lastName}`.trim();
        }

        // Handle nested fields that might have been sent as strings from FormData
        delete updateData._id;
        delete updateData.__v;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Certain fields in req.body might be "[object Object]" if not handled correctly on frontend
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === '[object Object]' || updateData[key] === 'undefined' || updateData[key] === 'null') {
                delete updateData[key];
                return;
            }
            
            // Try to parse JSON strings (for arrays/objects sent via FormData)
            if (typeof updateData[key] === 'string' && (updateData[key].startsWith('[') || updateData[key].startsWith('{'))) {
                try {
                    updateData[key] = JSON.parse(updateData[key]);
                } catch (e) {
                    // Not valid JSON, leave as is
                }
            }
        });

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        ).select("-password").populate('workSetup.shift').populate('leaveGroup');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Add top-level shift field for frontend compatibility
        const userObj = user.toObject();
        if (userObj.workSetup && userObj.workSetup.shift) {
            userObj.shift = userObj.workSetup.shift.shiftName;
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
            // Check for duplicate
            const existing = await User.findOne({ employeeId: employeeId.trim(), _id: { $ne: id } });
            if (existing) {
                results.failed.push({ id, reason: `ID "${employeeId}" already in use` });
                continue;
            }
            await User.findByIdAndUpdate(id, { employeeId: employeeId.trim() });
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

export { createUser, getUsers, getExEmployees, getUser, updateUser, deleteUser, getNextEmployeeId, bulkUpdateEmployeeIds, uploadUserDocument, deleteUserDocument, changeBranch };
