import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        firstName: {
            type: String
        },
        lastName: {
            type: String
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["Admin", "Manager", "Employee"],
            default: "Employee"
        },
        managementRole: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role"
        },
        status: {
            type: String,
            enum: ["Active", "Inactive", "Onboarding", "Ex-Employee", "Resigned", "Terminated", "Absconding", "Retired"],
            default: "Active"
        },
        exitDate: {
            type: Date
        },
        resignationDate: {
            type: Date
        },
        exitReason: {
            type: String
        },
        phone: {
            type: String,
            unique: true,
            sparse: true
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other", "Prefer not to say"],
            default: "Prefer not to say"
        },
        profilePhoto: {
            type: String
        },
        phoneCountryCode: String,
        emergencyCountryCode: String,
        altPhoneCountryCode: String,
        whatsappCountryCode: String,
        companyPhoneCountryCode: String,
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            pincode: String
        },
        emergencyContact: {
            name: String,
            relation: String,
            phone: String
        },
        emergencyNumber: {
            type: String
        },
        alternateMobileNumber: {
            type: String
        },
        companyNumber: {
            type: String
        },
        whatsAppNumber: {
            type: String
        },
        personalEmail: {
            type: String
        },
        currentAddress: {
            type: String
        },
        permanentAddress: {
            type: String
        },
        aliasName: {
            type: String
        },
        countryCode: {
            type: String
        },
        bloodGroup: String,
        maritalStatus: String,
        nationality: String,
        pastExperience: [{
            companyName: String,
            designation: String,
            workFrom: Date,
            workTo: Date,
            isCurrent: { type: Boolean, default: false },
            location: String,
            description: String
        }],
        probationPeriodDays: {
            type: Number
        },
        trainingCompletionDate: {
            type: Date
        },
        dateOfPermanent: {
            type: Date
        },
        branch: {
            type: String
        },
        employeeId: {
            type: String,
            unique: true,
            sparse: true
        }, 
        position: {
            type: String
        },
        designation: {
            type: String
        },
        department: {
            type: String
        },
        leaveGroup: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LeaveGroup'
        },
        dateJoined: {
            type: Date
        },
        employmentType: {
            type: String
        },
        workSetup: {
            location: String,
            mode: {
                type: String,
                enum: ["Office", "Hybrid", "Remote"],
                default: "Office"
            },
            shift: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Shift'
            }
        },
        salaryDetails: {
            salaryType: {
                type: String,
                enum: ["Monthly", "Hourly", "Contract"]
            },
            baseSalary: Number,
            payGrade: String,
            effectiveFrom: Date,
            ctc: Number
        },
        reportingTo: {
            type: String
        },
        subDepartment: {
            type: String
        },
        grade: {
            type: String
        },
        employeeLevel: {
            type: String
        },
        retirementAge: {
            type: Number
        },
        retireAt: {
            type: Date
        },
        biometricId: {
            type: String
        },
        previousMemberId: {
            type: String
        },
        isInternationalWorker: {
            type: String,
            default: "No"
        },
        insuranceNumber: {
            type: String
        },
        insuranceCompanyName: {
            type: String
        },
        insuranceExpiryDate: {
            type: Date
        },
        retirementAge: {
            type: Number
        },
        inviteSent: {
            type: Boolean,
            default: false
        },
        forcePasswordReset: {
            type: Boolean,
            default: true
        },
        permissions: {
            moduleAccess: [String],
            approvalRights: {
                type: Boolean,
                default: false
            }
        },
        documents: [{
            documentType: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DocumentType',
                required: true
            },
            fileUrl: { type: String, required: true },
            originalName: String,
            documentNumber: String,
            issueDate: Date,
            expiryDate: Date,
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        verification: {
            status: {
                type: String,
                enum: ["Pending", "Verified"],
                default: "Pending"
            },
            verifiedBy: String,
            verificationDate: Date
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        otp: {
            type: String
        },
        otpExpiry: {
            type: Date
        }
    },
    {
        timestamps: true
    }
)

const User = mongoose.model("User", userSchema)

export default User;
