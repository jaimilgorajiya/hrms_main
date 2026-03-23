import Shift from '../models/Shift.Model.js';
import User from '../models/User.Model.js';

// Get all shifts
export const getAllShifts = async (req, res) => {
    try {
        const shifts = await Shift.find()
            .populate('employeeCount')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, shifts });
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch shifts' });
    }
};

// Get shift by ID
export const getShiftById = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id)
            .populate('employeeCount')
            .populate('createdBy', 'name email');
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }
        res.status(200).json({ success: true, shift });
    } catch (error) {
        console.error('Error fetching shift:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch shift' });
    }
};

// Add new shift
export const addShift = async (req, res) => {
    try {
        // Check if shift code already exists (if provided)
        if (req.body.shiftCode) {
            const existingShift = await Shift.findOne({ shiftCode: req.body.shiftCode });
            if (existingShift) {
                return res.status(400).json({
                    success: false,
                    message: 'Shift code already exists. Please use a different code.'
                });
            }
        }

        // Check if shift name already exists
        const existingShiftName = await Shift.findOne({ shiftName: req.body.shiftName });
        if (existingShiftName) {
            return res.status(400).json({
                success: false,
                message: 'Shift name already exists. Please use a different name.'
            });
        }

        const shiftData = {
            ...req.body,
            createdBy: req.user.id
        };

        const shift = new Shift(shiftData);
        await shift.save();

        res.status(201).json({ 
            success: true, 
            message: 'Shift created successfully', 
            shift 
        });
    } catch (error) {
        console.error('Error creating shift:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create shift',
            error: error.message 
        });
    }
};

// Update shift
export const updateShift = async (req, res) => {
    try {
        // Check if shift code already exists (if being updated)
        if (req.body.shiftCode) {
            const existingShift = await Shift.findOne({ 
                shiftCode: req.body.shiftCode,
                _id: { $ne: req.params.id }
            });
            if (existingShift) {
                return res.status(400).json({
                    success: false,
                    message: 'Shift code already exists. Please use a different code.'
                });
            }
        }

        // Check if shift name already exists (if being updated)
        if (req.body.shiftName) {
            const existingShiftName = await Shift.findOne({ 
                shiftName: req.body.shiftName,
                _id: { $ne: req.params.id }
            });
            if (existingShiftName) {
                return res.status(400).json({
                    success: false,
                    message: 'Shift name already exists. Please use a different name.'
                });
            }
        }

        const shift = await Shift.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Shift updated successfully', 
            shift 
        });
    } catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update shift',
            error: error.message 
        });
    }
};

// Delete shift
export const deleteShift = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id).populate('employeeCount');
        
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }

        // Check if shift has employees assigned
        if (shift.employeeCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete shift. ${shift.employeeCount} employee(s) are currently assigned to this shift.` 
            });
        }

        await Shift.findByIdAndDelete(req.params.id);

        res.status(200).json({ 
            success: true, 
            message: 'Shift deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting shift:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete shift' 
        });
    }
};

// Toggle shift status
export const toggleShiftStatus = async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Shift not found' });
        }

        shift.isActive = !shift.isActive;
        await shift.save();

        res.status(200).json({ 
            success: true, 
            message: `Shift ${shift.isActive ? 'activated' : 'deactivated'} successfully`,
            shift 
        });
    } catch (error) {
        console.error('Error toggling shift status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to toggle shift status' 
        });
    }
};

// Get employees assigned to a shift
export const getShiftEmployees = async (req, res) => {
    try {
        const employees = await User.find({ 
            'workSetup.shift': req.params.id,
            status: { $in: ['Active', 'Onboarding'] }
        })
        .select('name email employeeId position department status')
        .sort({ name: 1 });

        res.status(200).json({ 
            success: true, 
            count: employees.length,
            employees 
        });
    } catch (error) {
        console.error('Error fetching shift employees:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch shift employees' 
        });
    }
};
