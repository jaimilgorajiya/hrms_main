import { generateAndSendDailyReport } from '../utils/attendanceReport.js';

export const triggerDailyReport = async (req, res) => {
    try {
        // Only Admins can trigger
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { date } = req.body; // Optional manual date
        const result = await generateAndSendDailyReport(req.user._id, date);

        if (result.success) {
            res.status(200).json({ success: true, message: 'Daily report email sent successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send report email', error: result.error });
        }
    } catch (error) {
        console.error('Trigger Daily Report Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};
