import RetirementSetting from '../models/RetirementSetting.Model.js';

export const getRetirementSetting = async (req, res) => {
    try {
        const adminId = req.user._id;
        let setting = await RetirementSetting.findOne({ adminId });
        if (!setting) {
            setting = await RetirementSetting.create({ adminId });
        }
        res.status(200).json({ success: true, setting });
    } catch (error) {
        console.error('getRetirementSetting error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const updateRetirementSetting = async (req, res) => {
    try {
        const adminId = req.user._id;
        const data = { ...req.body };

        // Validate retirement age range
        if (data.defaultRetirementAge !== undefined) {
            const age = Number(data.defaultRetirementAge);
            if (isNaN(age) || age < 40 || age > 80) {
                return res.status(400).json({ success: false, message: 'Retirement age must be between 40 and 80' });
            }
            data.defaultRetirementAge = age;
        }

        // Validate notificationDays
        if (data.notificationDays) {
            if (!Array.isArray(data.notificationDays) || data.notificationDays.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one notification day is required' });
            }
            data.notificationDays = data.notificationDays.map(Number).filter(n => !isNaN(n) && n > 0);
        }

        // If extension disabled, clear extension fields
        if (data.allowExtension === false || data.allowExtension === 'false') {
            data.allowExtension = false;
        }

        const setting = await RetirementSetting.findOneAndUpdate(
            { adminId },
            { $set: data },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({ success: true, message: 'Retirement settings saved', setting });
    } catch (error) {
        console.error('updateRetirementSetting error:', error.message);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join(', ') });
        }
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
