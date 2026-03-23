import Promotion from '../models/Promotion.Model.js';
import User from '../models/User.Model.js';

export const getPromotions = async (req, res) => {
    try {
        const adminId = req.user._id;
        const promotions = await Promotion.find({ adminId })
            .populate('employeeId', 'name employeeId designation department branch profilePhoto')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, promotions });
    } catch (error) {
        console.error('getPromotions error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const addPromotion = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { employeeId, branch, department, newDesignation, promotionFrom, remark } = req.body;

        if (!employeeId || !branch || !department || !newDesignation || !promotionFrom) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        const employee = await User.findById(employeeId);
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Snapshot previous values
        const previousDesignation = employee.designation || '';
        const previousDepartment = employee.department || '';

        // Create promotion record
        const promotion = await Promotion.create({
            adminId,
            employeeId,
            branch,
            department,
            previousDesignation,
            previousDepartment,
            newDesignation,
            promotionFrom,
            remark
        });

        // Update employee's designation and department
        employee.designation = newDesignation;
        employee.department = department;
        await employee.save();

        const populated = await Promotion.findById(promotion._id)
            .populate('employeeId', 'name employeeId designation department branch profilePhoto');

        res.status(201).json({ success: true, message: 'Promotion added successfully', promotion: populated });
    } catch (error) {
        console.error('addPromotion error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const updatePromotion = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { newDesignation, promotionFrom, remark, department, branch } = req.body;

        const promotion = await Promotion.findOne({ _id: req.params.id, adminId });
        if (!promotion) return res.status(404).json({ success: false, message: 'Promotion not found' });

        // If designation changed, update the employee record too
        if (newDesignation && newDesignation !== promotion.newDesignation) {
            await User.findByIdAndUpdate(promotion.employeeId, { designation: newDesignation, department });
        }

        promotion.newDesignation = newDesignation || promotion.newDesignation;
        promotion.promotionFrom = promotionFrom || promotion.promotionFrom;
        promotion.remark = remark ?? promotion.remark;
        promotion.department = department || promotion.department;
        promotion.branch = branch || promotion.branch;
        await promotion.save();

        const populated = await Promotion.findById(promotion._id)
            .populate('employeeId', 'name employeeId designation department branch profilePhoto');

        res.status(200).json({ success: true, message: 'Promotion updated', promotion: populated });
    } catch (error) {
        console.error('updatePromotion error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
