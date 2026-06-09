import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import User from '../models/User.Model.js';
import EarningDeductionType from '../models/EarningDeductionType.Model.js';
import SalaryGroup from '../models/SalaryGroup.Model.js';

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

        // If salaryGroup is provided, update the employee's work setup
        if (req.body.salaryGroup) {
            user.workSetup = user.workSetup || {};
            user.workSetup.salaryGroup = req.body.salaryGroup;
            await user.save();
        }

        // Upsert: Find existing and update, or create new
        const calcMonthlyGross = monthlyGross || 0;
        const calcNetSalary = netSalary !== undefined ? netSalary : calcMonthlyGross;
        const calcAnnualCTC = annualCTC || (calcMonthlyGross * 12);

        // Check if there is an existing CTC record for history snapshotting
        const existingCTC = await EmployeeCTC.findOne({ employeeId });
        let historyItem = null;
        let incrementPercentage = 0;

        if (existingCTC) {
            const existingDateStr = existingCTC.effectiveDate ? new Date(existingCTC.effectiveDate).toISOString().split('T')[0] : '';
            const newDateStr = effectiveDate ? new Date(effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            // If effective date or total CTC changed, archive the current record as history
            if (existingDateStr !== newDateStr || existingCTC.annualCTC !== calcAnnualCTC) {
                let oldSalaryGroupName = '';
                if (user.workSetup && user.workSetup.salaryGroup) {
                    const sg = await SalaryGroup.findById(user.workSetup.salaryGroup);
                    if (sg) {
                        oldSalaryGroupName = sg.groupName;
                    }
                }

                historyItem = {
                    annualCTC: existingCTC.annualCTC,
                    monthlyGross: existingCTC.monthlyGross,
                    netSalary: existingCTC.netSalary,
                    earnings: existingCTC.earnings.map(e => ({
                        componentId: e.componentId,
                        componentName: e.componentName,
                        amount: e.amount
                    })),
                    deductions: existingCTC.deductions.map(d => ({
                        componentId: d.componentId,
                        componentName: d.componentName,
                        amount: d.amount
                    })),
                    effectiveDate: existingCTC.effectiveDate,
                    endDate: new Date(new Date(newDateStr).getTime() - 24 * 60 * 60 * 1000), // Day before the new revision
                    incrementPercentage: existingCTC.incrementPercentage || 0,
                    status: 'Previous',
                    branch: user.branch || '',
                    department: user.department || '',
                    designation: user.designation || '',
                    salaryGroup: oldSalaryGroupName || '',
                    updatedAt: existingCTC.updatedAt || new Date()
                };

                const oldAnnual = existingCTC.annualCTC || 0;
                if (oldAnnual > 0) {
                    incrementPercentage = Math.round(((calcAnnualCTC - oldAnnual) / oldAnnual) * 100);
                }
            }
        }

        const ctcData = {
            employeeId,
            annualCTC: calcAnnualCTC,
            monthlyGross: calcMonthlyGross,
            earnings: earnings || [],
            deductions: deductions || [],
            netSalary: calcNetSalary,
            effectiveDate: effectiveDate || Date.now(),
            status: status || 'Active',
            incrementPercentage,
            adminId
        };

        let updatedCTC;
        if (historyItem) {
            updatedCTC = await EmployeeCTC.findOneAndUpdate(
                { employeeId },
                { 
                    $set: ctcData,
                    $push: { history: historyItem }
                },
                { new: true, upsert: true, runValidators: true }
            );
        } else {
            updatedCTC = await EmployeeCTC.findOneAndUpdate(
                { employeeId },
                { $set: ctcData },
                { new: true, upsert: true, runValidators: true }
            );
        }

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
            .populate({
                path: 'employeeId',
                select: 'name employeeId workSetup email phone department designation branch dateJoined',
                populate: { path: 'workSetup.salaryGroup', select: 'groupName' }
            });

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
        .select('name employeeId email workSetup profilePhoto status designation branch department');

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
