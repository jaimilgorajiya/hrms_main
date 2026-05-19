import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Generate random password
export const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Send welcome email with credentials
export const sendWelcomeEmail = async (userEmail, userName, employeeId, temporaryPassword) => {
    try {
        const mailOptions = {
            from: `"Employee Management System" <${process.env.SMTP_FROM}>`,
            to: userEmail,
            subject: 'Welcome to Employee Management System - Your Login Credentials',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
                        .credential-item { margin: 10px 0; }
                        .credential-label { font-weight: bold; color: #667eea; }
                        .credential-value { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 3px; display: inline-block; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to EMS!</h1>
                        </div>
                        <div class="content">
                            <p>Hello <strong>${userName}</strong>,</p>
                            
                            <p>Your account has been successfully created in our Employee Management System. Your registered profile details are below:</p>
                            
                            <div class="credentials">
                                <div class="credential-item">
                                    <span class="credential-label">Employee ID:</span>
                                    <span class="credential-value">${employeeId}</span>
                                </div>
                                <div class="credential-item">
                                    <span class="credential-label">Email:</span>
                                    <span class="credential-value">${userEmail}</span>
                                </div>
                            </div>
                            
                            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                                <h3 style="margin-top: 0; color: #1e40af; font-size: 16px; font-weight: 700;">📱 Download Our Mobile App</h3>
                                <p style="margin: 8px 0 16px 0; font-size: 13px; color: #1e3a8a; line-height: 1.5;">
                                    Access your attendance, punch in/out, check leave requests, and view pay details directly on the go. Get the Android application using the one-click download button below:
                                </p>
                                <center style="text-align: left;">
                                    <a href="https://expo.dev/accounts/jaimilgorajiya/projects/hrms-employee-app/builds/8a55d650-5008-4a66-8d61-de9a764c6802" 
                                       style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);">
                                        📥 Download Android App (APK)
                                    </a>
                                </center>
                            </div>

                            <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 5px;">
                                <strong>🔑 Secure OTP Sign In:</strong>
                                <p style="margin: 5px 0 0 0; font-size: 13.5px; color: #92400e; line-height: 1.5;">
                                    There is no password required for your account. You can securely log in to the employee dashboard or mobile application at any time using your registered mobile number and a one-time verification code (OTP) sent directly to your phone.
                                </p>
                            </div>
                            
                            <p>If you have any questions or need assistance, please contact your HR department or system administrator.</p>
                            
                            <p>Best regards,<br><strong>HR Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; ${new Date().getFullYear()} Employee Management System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent:', info.messageId);
        // For development/debugging:
        console.log('--- NEW USER CREDENTIALS ---');
        console.log('Email:', userEmail);
        console.log('Password:', temporaryPassword);
        console.log('----------------------------');
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        // Log credentials even if email fails (for development)
        console.log('--- NEW USER CREDENTIALS (EMAIL FAILED) ---');
        console.log('Email:', userEmail);
        console.log('Password:', temporaryPassword);
        console.log('-----------------------------------------');
        return { success: false, error: error.message };
    }
};

// Send admin welcome email after payment
export const sendAdminWelcomeEmail = async (userEmail, userName, plainPassword) => {
    try {
        const mailOptions = {
            from: `"HRMS Onboarding" <${process.env.SMTP_FROM}>`,
            to: userEmail,
            subject: 'Welcome to HRMS - Your Login Credentials',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f1f5f9; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
                        .content { padding: 30px; }
                        .welcome-text { font-size: 16px; margin-bottom: 25px; }
                        .credentials { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6; }
                        .credential-item { margin: 12px 0; display: flex; align-items: center; }
                        .credential-label { font-weight: 600; color: #64748b; width: 90px; display: inline-block; }
                        .credential-value { font-family: 'Courier New', monospace; font-size: 16px; background: #e2e8f0; padding: 6px 12px; border-radius: 4px; color: #0f172a; font-weight: 700; letter-spacing: 0.5px; }
                        .button-container { text-align: center; margin: 35px 0 20px; }
                        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); }
                        .security-notice { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; font-size: 14px; color: #92400e; margin-top: 25px; }
                        .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to HRMS!</h1>
                        </div>
                        <div class="content">
                            <div class="welcome-text">
                                <p>Hello <strong>${userName}</strong>,</p>
                                <p>Thank you for choosing HRMS. Your payment was successful and your administrative workspace is now fully active.</p>
                                <p>Here are your secure login credentials:</p>
                            </div>
                            
                            <div class="credentials">
                                <div class="credential-item">
                                    <span class="credential-label">Email:</span>
                                    <span class="credential-value">${userEmail}</span>
                                </div>
                                <div class="credential-item">
                                    <span class="credential-label">Password:</span>
                                    <span class="credential-value">${plainPassword}</span>
                                </div>
                            </div>
                            
                            <div class="security-notice">
                                <strong>🔒 Security Notice:</strong> Please change your password immediately after logging in for the first time.
                            </div>
                            
                            <div class="button-container">
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" class="button">Access Dashboard</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; ${new Date().getFullYear()} HRMS. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Admin welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending admin welcome email:', error);
        return { success: false, error: error.message };
    }
};

// Send offboarding document
export const sendOffboardingDocument = async (userEmail, userName, documentType, documentUrl) => {
    try {
        const mailOptions = {
            from: `"Employee Management System" <${process.env.SMTP_FROM}>`,
            to: userEmail,
            subject: `Exit Document: ${documentType}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">${documentType} Generated</h2>
                    <p>Dear ${userName},</p>
                    <p>Your <strong>${documentType}</strong> has been generated as part of your offboarding process.</p>
                    <p>You can view and download it using the link below:</p>
                    <div style="margin: 20px 0;">
                        <a href="${documentUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Document</a>
                    </div>
                    <p>Or copy this link: <br> <a href="${documentUrl}">${documentUrl}</a></p>
                    <p>Best Regards,<br>HR Team</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Offboarding document (${documentType}) email sent:`, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Error sending ${documentType} email:`, error);
        return { success: false, error: error.message };
    }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
    try {
        // await transporter.verify(); // Commented out to avoid blocking if SMTP is not configured
        // Configuration verified silently
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
};

// Send retirement notification email to HR/Admin
export const sendRetirementNotificationEmail = async (hrEmail, employeeName, retirementDate, daysRemaining) => {
    try {
        const formattedDate = new Date(retirementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const mailOptions = {
            from: `"HRMS Retirement Alert" <${process.env.SMTP_FROM}>`,
            to: hrEmail,
            subject: `Retirement Alert: ${employeeName} retires in ${daysRemaining} day(s)`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1E293B; color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h2 style="margin: 0;">Retirement Notification</h2>
                    </div>
                    <div style="background: #F8FAFC; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #E2E8F0;">
                        <p>This is an automated reminder that <strong>${employeeName}</strong> is scheduled to retire in <strong>${daysRemaining} day(s)</strong>.</p>
                        <div style="background: white; border-left: 4px solid #2563EB; padding: 16px; margin: 16px 0; border-radius: 4px;">
                            <p style="margin: 0;"><strong>Employee:</strong> ${employeeName}</p>
                            <p style="margin: 8px 0 0;"><strong>Retirement Date:</strong> ${formattedDate}</p>
                            <p style="margin: 8px 0 0;"><strong>Days Remaining:</strong> ${daysRemaining}</p>
                        </div>
                        <p>Please take necessary action in the HRMS system.</p>
                        <p style="color: #64748B; font-size: 12px;">This is an automated notification. Do not reply.</p>
                    </div>
                </div>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Retirement notification email error:', error);
        return { success: false, error: error.message };
    }
};
// Send Daily Attendance Report to Admin
export const sendDailyAttendanceReport = async (adminEmail, reportData) => {
    try {
        const { date, stats, records } = reportData;
        
        const mailOptions = {
            from: `"HRMS Daily Report" <${process.env.SMTP_FROM}>`,
            to: adminEmail,
            subject: `Daily Attendance Report - ${date}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.5; }
                        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { background: #1e293b; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
                        .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }
                        .stat-val { font-size: 20px; font-weight: bold; color: #2563eb; }
                        .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                        th { background: #f1f5f9; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
                        .status-pill { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
                        .status-present { background: #dcfce7; color: #15803d; }
                        .status-absent { background: #fee2e2; color: #b91c1c; }
                        .status-half { background: #fef9c3; color: #854d0e; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2 style="margin: 0;">Daily Attendance Report</h2>
                            <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8;">Report Date: ${date}</p>
                        </div>

                        <div style="display: flex; gap: 10px; margin: 20px 0;">
                            <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 20px; font-weight: bold; color: #1e293b;">${stats.total}</div>
                                <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Staff</div>
                            </div>
                            <div style="flex: 1; background: #dcfce7; border: 1px solid #bbfcce; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 20px; font-weight: bold; color: #15803d;">${stats.present}</div>
                                <div style="font-size: 11px; color: #15803d; text-transform: uppercase;">Present</div>
                            </div>
                            <div style="flex: 1; background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 20px; font-weight: bold; color: #b91c1c;">${stats.absent}</div>
                                <div style="font-size: 11px; color: #b91c1c; text-transform: uppercase;">Absent</div>
                            </div>
                            <div style="flex: 1; background: #fef9c3; border: 1px solid #fef08a; padding: 15px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 20px; font-weight: bold; color: #854d0e;">${stats.halfDay}</div>
                                <div style="font-size: 11px; color: #854d0e; text-transform: uppercase;">Half Day</div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Status</th>
                                    <th>Punch In</th>
                                    <th>Punch Out</th>
                                    <th>Work Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.map(r => `
                                    <tr>
                                        <td>
                                            <strong>${r.name}</strong><br>
                                            <span style="font-size: 11px; color: #64748b;">${r.empId} | ${r.dept}</span>
                                        </td>
                                        <td>
                                            <span class="status-pill status-${r.status.toLowerCase().replace(' ', '')}">
                                                ${r.status}
                                            </span>
                                        </td>
                                        <td>${r.punchIn || '--:--'}</td>
                                        <td>${r.punchOut || '--:--'}</td>
                                        <td>${r.workHours || '0h 0m'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="footer">
                            <p>This is an automated report from HRMS.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Daily Report Email Error:', error);
        return { success: false, error: error.message };
    }
};

// Send password reset email
export const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
    try {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: `"HRMS Security" <${process.env.SMTP_FROM}>`,
            to: userEmail,
            subject: 'Password Reset Request - HRMS',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1e293b; color: white; padding: 28px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h2 style="margin: 0; font-size: 22px;">Password Reset</h2>
                    </div>
                    <div style="background: #f8fafc; padding: 28px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                        <p>Hi <strong>${userName}</strong>,</p>
                        <p>We received a request to reset your HRMS password. Click the button below to set a new password:</p>
                        <div style="text-align: center; margin: 28px 0;">
                            <a href="${resetUrl}" style="background: #2563EB; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Reset Password</a>
                        </div>
                        <p style="color: #64748b; font-size: 13px;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
};
