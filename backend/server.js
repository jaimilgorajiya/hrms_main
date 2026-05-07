import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';


const serviceAccountPath = path.resolve('serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} 


import { verifyEmailConfig } from './utils/emailService.js';
import { initCronJobs } from './utils/cronJobs.js';
import authRoutes from './routes/Auth.Routes.js';
import userRoutes from './routes/User.Routes.js';
import employmentTypeRoutes from './routes/EmploymentType.Routes.js';
import departmentRoutes from './routes/Department.Routes.js';
import designationRoutes from './routes/Designation.Routes.js';
import branchRoutes from './routes/Branch.Routes.js';
import locationRoutes from './routes/Location.Routes.js';
import uploadRoutes from './routes/Upload.Routes.js';
import userManagementRoutes from './routes/UserManagement.Routes.js';
import offboardingRoutes from './routes/Offboarding.Routes.js';
import dashboardRoutes from './routes/Dashboard.Route.js';
import companyRoutes from './routes/Company.Routes.js';
import breakTypeRoutes from './routes/BreakType.Routes.js';
import shiftRoutes from './routes/Shift.Routes.js';
import penaltyRuleRoutes from './routes/PenaltyRule.Routes.js';
import graceTimeRoutes from './routes/GraceTime.Routes.js';
import payrollRoutes from './routes/Payroll.Routes.js';
import leaveTypeRoutes from './routes/LeaveType.Routes.js';
import earningDeductionTypeRoutes from './routes/EarningDeductionType.Routes.js';
import documentTypeRoutes from './routes/DocumentType.Routes.js';

import onboardingDocSettingRoutes from './routes/OnboardingDocSetting.Routes.js';
import leaveGroupRoutes from './routes/LeaveGroup.Routes.js';
import salaryGroupRoutes from './routes/SalaryGroup.Routes.js';
import employeeCTCRoutes from './routes/EmployeeCTC.Routes.js';

import payrollSettingRoutes from './routes/PayrollSetting.Routes.js';
import roleRoutes from './routes/Role.Routes.js';
import retirementRoutes from './routes/Retirement.Routes.js';
import promotionRoutes from './routes/Promotion.Routes.js';
import employeeDashboardRoutes from './routes/EmployeeDashboard.Route.js';
import attendanceRoutes from './routes/Attendance.Routes.js';
import notificationRoutes from './routes/Notification.Routes.js';
import requestRoutes from './routes/Request.Routes.js';
import resignationRoutes from './routes/Resignation.Routes.js';
import reportRoutes from './routes/AttendanceReport.Route.js';

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

// Initialize Automated Tasks (Cron Jobs)
initCronJobs();

// Verify email configuration on startup
verifyEmailConfig();

app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false }));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000 // Allow up to 5000 requests per 15 mins for all APIs (adjust if needed)
});
app.use('/api', limiter);
app.use(hpp());
app.use(cors({
    origin: [
        process.env.CLIENT_URL, 
        'http://localhost:5173', 
        'http://localhost:5174', 
        'http://localhost:5175',
        'http://localhost:8081',  // Expo web
        'http://192.168.29.90:5173',
        'http://192.168.29.90:5174',
        'http://192.168.29.90:5175',
        'http://192.168.29.90:8081',  // Expo web on LAN
    ],
    credentials: true,
}));
app.use(cookieParser());
app.use('/uploads', express.static('public/uploads'));


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employment-types', employmentTypeRoutes); 
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/user-management', userManagementRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/break-types', breakTypeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/penalty-rules', penaltyRuleRoutes);
app.use('/api/grace-times', graceTimeRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/earning-deduction-types', earningDeductionTypeRoutes);
app.use('/api/payroll-settings', payrollSettingRoutes);
app.use('/api/document-types', documentTypeRoutes);
app.use('/api/onboarding-doc-settings', onboardingDocSettingRoutes);
app.use('/api/leave-groups', leaveGroupRoutes);
app.use('/api/salary-groups', salaryGroupRoutes);
app.use('/api/employee-ctc', employeeCTCRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/retirement', retirementRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/employee-dashboard', employeeDashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/resignation', resignationRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/payroll', payrollRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API: http://localhost:${PORT} | Client: ${process.env.CLIENT_URL || 'Not Set'}`);
});