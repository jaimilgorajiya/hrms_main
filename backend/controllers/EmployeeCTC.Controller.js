import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import User from '../models/User.Model.js';
import EarningDeductionType from '../models/EarningDeductionType.Model.js';

// Upsert CTC for an employee
const upsertEmployeeCTC = async (req, res) => {
    try {
        const { 
            employeeId, 
            annualCTC, 
            monthlyGross, 
            earnings, 
            deductions, 
            netSalary, 
            effectiveDate,
            status 
        } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required" });
        }

        // Check if employee exists
        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const adminId = req.user._id;

        // Upsert: Find existing and update, or create new
        const ctcData = {
            employeeId,
            annualCTC,
            monthlyGross,
            earnings,
            deductions,
            netSalary,
            effectiveDate: effectiveDate || Date.now(),
            status: status || 'Active',
            adminId
        };

        const updatedCTC = await EmployeeCTC.findOneAndUpdate(
            { employeeId },
            { $set: ctcData },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Employee CTC updated successfully",
            ctc: updatedCTC
        });
    } catch (error) {
        console.error("Error in upsertEmployeeCTC:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// Get CTC for a specific employee
const getEmployeeCTC = async (req, res) => {
    try {
        const { id } = req.params;
        const ctc = await EmployeeCTC.findOne({ employeeId: id })
            .populate('employeeId', 'name employeeId workSetup');

        if (!ctc) {
            return res.status(404).json({ success: false, message: "CTC structure not found for this employee" });
        }

        res.status(200).json({ success: true, ctc });
    } catch (error) {
        console.error("Error in getEmployeeCTC:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Get all CTCs with employee details
const getAllEmployeeCTCs = async (req, res) => {
    try {
        const adminId = req.user._id;
        
        // Fetch all active employees who are NOT admins
        const employees = await User.find({ 
            adminId, 
            role: { $ne: 'Admin' },
            status: { $nin: ['Ex-Employee', 'Terminated'] }
        })
        .populate('workSetup.salaryGroup', 'groupName')
        .select('name employeeId email workSetup profilePhoto status designation');

        // Fetch all CTC records
        const ctcRecords = await EmployeeCTC.find({ adminId });
        
        // Map records for easy lookup
        const ctcMap = {};
        ctcRecords.forEach(rec => {
            ctcMap[rec.employeeId.toString()] = rec;
        });

        // Combine data
        const combinedData = employees.map(emp => {
            const empObj = emp.toObject();
            empObj.ctcDetails = ctcMap[emp._id.toString()] || null;
            return empObj;
        });

        res.status(200).json({ success: true, data: combinedData });
    } catch (error) {
        console.error("Error in getAllEmployeeCTCs:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Get available earning/deduction types for dropdowns
const getAvailableComponentTypes = async (req, res) => {
    try {
        const adminId = req.user._id;
        const components = await EarningDeductionType.find({ adminId, status: 'Active' });
        
        const earnings = components.filter(c => c.type === 'Earnings');
        const deductions = components.filter(c => c.type === 'Deductions');

        res.status(200).json({ success: true, earnings, deductions });
    } catch (error) {
        console.error("Error in getAvailableComponentTypes:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export { 
    upsertEmployeeCTC, 
    getEmployeeCTC, 
    getAllEmployeeCTCs, 
    getAvailableComponentTypes 
};
