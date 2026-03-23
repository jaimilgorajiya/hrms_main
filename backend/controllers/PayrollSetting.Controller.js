import PayrollSetting from '../models/PayrollSetting.Model.js';
import Company from '../models/Company.Model.js';
import { generatePayslipPreview } from '../utils/payslipGenerator.js';

export const getPayrollSetting = async (req, res) => {
    try {
        const adminId = req.user._id;
        let setting = await PayrollSetting.findOne({ adminId });

        if (!setting) {
            // Create default setting if it doesn't exist
            setting = await PayrollSetting.create({ adminId });
        }

        res.status(200).json({ success: true, setting });
    } catch (error) {
        console.error("Error in getPayrollSetting:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updatePayrollSetting = async (req, res) => {
    try {
        const adminId = req.user._id;
        const updateData = { ...req.body };

        // Clean up empty fields to prevent Mongoose validation and cast errors
        if (updateData.form16ResponsibleUser === "" || updateData.form16ResponsibleUser === "null") {
            updateData.form16ResponsibleUser = null;
        }
        
        // Ensure numeric fields are numbers or handled if empty
        // (Cleaned up as fields were removed from UI)

        // Handle file uploads if they exist
        if (req.files) {
            if (req.files.form16Signature) {
                updateData.form16Signature = `/uploads/${req.files.form16Signature[0].filename}`;
            }
            if (req.files.salaryStampSignature) {
                updateData.salaryStampSignature = `/uploads/${req.files.salaryStampSignature[0].filename}`;
            }
        }

        const setting = await PayrollSetting.findOneAndUpdate(
            { adminId },
            { $set: updateData },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: "Payroll settings updated successfully", setting });
    } catch (error) {
        console.error("Error in updatePayrollSetting:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const removeSignature = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { type } = req.params; // 'form16' or 'salary'

        const field = type === 'form16' ? 'form16Signature' : 'salaryStampSignature';
        
        await PayrollSetting.findOneAndUpdate(
            { adminId },
            { $unset: { [field]: "" } }
        );

        res.status(200).json({ success: true, message: `${type === 'form16' ? 'Form 16' : 'Salary'} signature removed` });
    } catch (error) {
        console.error("Error in removeSignature:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const previewPayslip = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { format } = req.query;
        
        // Fetch real settings and company data for a realistic preview
        const [setting, company] = await Promise.all([
            PayrollSetting.findOne({ adminId }),
            Company.findOne({ adminId })
        ]);
        
        const previewData = {
            format: format || setting?.payslipFormat || 'Format 1',
            displayRoundOff: setting?.displayRoundOffAmount === 'Yes'
        };

        const pdfBuffer = await generatePayslipPreview(previewData.format, {
            companyName: company?.companyName || 'YOUR HRMS COMPANY',
            address: company?.address || 'City, State, Zip',
            // pass other dynamic data here
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="payslip-preview.pdf"',
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating preview:", error);
        res.status(500).json({ success: false, message: "Failed to generate preview" });
    }
};
