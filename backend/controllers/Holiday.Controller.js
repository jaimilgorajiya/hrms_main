import Holiday from '../models/Holiday.Model.js';
import User from '../models/User.Model.js';

// ─── Admin: Get all holidays for a year ─────────────────────────────────────
export const getHolidays = async (req, res) => {
    try {
        const { year } = req.query;
        const adminId = req.user._id;

        const filter = { adminId };
        if (year) filter.year = parseInt(year);

        const holidays = await Holiday.find(filter).sort({ date: 1 });
        res.status(200).json({ success: true, holidays });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Employee: Get holidays applicable to them ───────────────────────────────
export const getMyHolidays = async (req, res) => {
    try {
        const { year } = req.query;
        const employee = await User.findById(req.user._id);
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        const adminId = employee.adminId;
        if (!adminId) return res.status(404).json({ success: false, message: 'Admin not found for this employee' });

        const filter = { adminId, status: 'Active' };
        if (year) filter.year = parseInt(year);

        const allHolidays = await Holiday.find(filter).sort({ date: 1 });

        // Filter by applicability
        const applicable = allHolidays.filter(h => {
            if (h.applicableTo === 'All') return true;
            if (h.applicableTo === 'Branch' && h.branches.includes(employee.branch)) return true;
            if (h.applicableTo === 'Department' && h.departments.includes(employee.department)) return true;
            return false;
        });

        res.status(200).json({ success: true, holidays: applicable });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Create holiday ───────────────────────────────────────────────────
export const addHoliday = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { name, date, type, applicableTo, branches, departments, description } = req.body;

        if (!name || !date) {
            return res.status(400).json({ success: false, message: 'Name and date are required' });
        }

        const year = parseInt(date.split('-')[0]);

        // Prevent duplicate on same date with same name
        const existing = await Holiday.findOne({ adminId, date, name });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A holiday with this name already exists on this date' });
        }

        const holiday = new Holiday({
            name, date, year, type, applicableTo,
            branches: branches || [],
            departments: departments || [],
            description: description || '',
            adminId,
        });

        await holiday.save();
        res.status(201).json({ success: true, message: 'Holiday added successfully', holiday });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Update holiday ───────────────────────────────────────────────────
export const updateHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const updateData = { ...req.body };
        // Re-derive year if date changed
        if (updateData.date) {
            updateData.year = parseInt(updateData.date.split('-')[0]);
        }

        const holiday = await Holiday.findOneAndUpdate(
            { _id: id, adminId },
            updateData,
            { new: true }
        );

        if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
        res.status(200).json({ success: true, message: 'Holiday updated successfully', holiday });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Delete holiday ───────────────────────────────────────────────────
export const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const holiday = await Holiday.findOneAndDelete({ _id: id, adminId });
        if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });

        res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Bulk delete ──────────────────────────────────────────────────────
export const bulkDeleteHolidays = async (req, res) => {
    try {
        const { ids } = req.body;
        const adminId = req.user._id;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        const result = await Holiday.deleteMany({ _id: { $in: ids }, adminId });
        res.status(200).json({ success: true, message: `${result.deletedCount} holiday(s) deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Admin: Toggle status ────────────────────────────────────────────────────
export const toggleHolidayStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const holiday = await Holiday.findOne({ _id: id, adminId });
        if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });

        holiday.status = holiday.status === 'Active' ? 'Inactive' : 'Active';
        await holiday.save();

        res.status(200).json({ success: true, message: `Holiday is now ${holiday.status}`, status: holiday.status });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
