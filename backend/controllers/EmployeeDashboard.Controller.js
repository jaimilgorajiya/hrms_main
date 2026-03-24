import User from "../models/User.Model.js";
import Branch from "../models/Branch.Model.js";

export const getEmployeeStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const employee = await User.findById(userId)
            .populate('workSetup.shift')
            .populate('leaveGroup')
            .populate('documents.documentType')
            .select('-password');

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const emp = employee.toObject();

        // Get day name
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = days[new Date().getDay()];

        // Build shift info
        const shift = emp.workSetup?.shift || null;
        const schedule = shift?.schedule?.[todayName] || null;
        const isWeekOff = shift?.weekOffDays?.includes(todayName.charAt(0).toUpperCase() + todayName.slice(1)) || false;

        // Build leave balance info from leaveGroup
        const leaveGroup = emp.leaveGroup || null;
        const totalLeaves = leaveGroup?.noOfPaidLeaves || 0;

        // Document count
        const documentCount = emp.documents?.length || 0;

        // Days since joining
        let daysSinceJoining = null;
        if (emp.dateJoined) {
            const joined = new Date(emp.dateJoined);
            const now = new Date();
            daysSinceJoining = Math.floor((now - joined) / (1000 * 60 * 60 * 24));
        }

        // Fetch branch coordinates
        let branchCoords = null;
        const targetBranch = (emp.branch || emp.workSetup?.location || '').trim();
        
        if (targetBranch) {
            // Find branch by name (case-insensitive)
            const branch = await Branch.findOne({ 
                branchName: { $regex: new RegExp(`^${targetBranch}$`, 'i') } 
            }).sort({ latitude: -1 }); // Prioritize one with actual coords if duplicates exist
            
            if (branch) {
                branchCoords = {
                    latitude: branch.latitude,
                    longitude: branch.longitude,
                    radius: branch.radius
                };
            }
        }

        res.status(200).json({
            success: true,
            employee: {
                _id: emp._id,
                name: emp.name,
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                phone: emp.phone,
                employeeId: emp.employeeId,
                designation: emp.designation,
                department: emp.department,
                branch: emp.branch,
                dateJoined: emp.dateJoined,
                employmentType: emp.employmentType,
                status: emp.status,
                profilePhoto: emp.profilePhoto,
                gender: emp.gender,
                dateOfBirth: emp.dateOfBirth,
                bloodGroup: emp.bloodGroup,
                maritalStatus: emp.maritalStatus,
                nationality: emp.nationality,
                address: emp.address,
                currentAddress: emp.currentAddress,
                permanentAddress: emp.permanentAddress,
                emergencyContact: emp.emergencyContact,
                reportingTo: emp.reportingTo,
                workSetup: emp.workSetup,
                salaryDetails: emp.salaryDetails,
                documents: emp.documents,
                pastExperience: emp.pastExperience,
                grade: emp.grade,
                employeeLevel: emp.employeeLevel,
            },
            stats: {
                totalLeaves,
                documentCount,
                daysSinceJoining,
                shiftName: shift?.shiftName || null,
                shiftStart: schedule?.shiftStart || null,
                shiftEnd: schedule?.shiftEnd || null,
                isWeekOff,
                weekOffDays: shift?.weekOffDays || [],
                leaveGroupName: leaveGroup?.leaveGroupName || null,
                branchCoords
            }
        });
    } catch (error) {
        console.error("Error in getEmployeeStats:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
