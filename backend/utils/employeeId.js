import User from "../models/User.Model.js";
import Company from "../models/Company.Model.js";

export const generateEmployeeId = async (adminId = null) => {
    // Fetch format from company settings if adminId provided
    let prefix = 'EMP';
    let includeYear = true;
    let digitCount = 4;
    let separator = '';

    if (adminId) {
        const company = await Company.findOne({ adminId });
        if (company?.employeeIdFormat) {
            const fmt = company.employeeIdFormat;
            prefix = fmt.prefix || 'EMP';
            includeYear = fmt.includeYear !== undefined ? fmt.includeYear : true;
            digitCount = fmt.digitCount || 4;
            separator = fmt.separator || '';
        }
    }

    const year = new Date().getFullYear();
    const count = await User.countDocuments();

    const numPart = String(count + 1).padStart(digitCount, '0');
    const yearPart = includeYear ? `${separator}${year}${separator}` : separator;
    const id = `${prefix}${yearPart}${numPart}`;

    const exists = await User.findOne({ employeeId: id });
    if (exists) {
        const numPart2 = String(count + 2).padStart(digitCount, '0');
        return `${prefix}${yearPart}${numPart2}`;
    }
    return id;
};
