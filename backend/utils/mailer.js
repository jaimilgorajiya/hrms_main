import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendClientCredentialsMail = async ({ ownerName, businessName, email, password }) => {
    const loginUrl = process.env.CLIENT_URL;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to HRMS</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #333;">Hi <strong>${ownerName}</strong>,</p>
        <p style="font-size: 15px; color: #555;">
          Your HRMS account for <strong>${businessName}</strong> has been created successfully. 
          Here are your login credentials:
        </p>
        <div style="background-color: #f5f5f5; border-radius: 6px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #4f46e5;">${loginUrl}</a></p>
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0; font-size: 15px;"><strong>Password:</strong> ${password}</p>
        </div>
        <p style="font-size: 14px; color: #888;">
          Please log in and change your password immediately for security purposes.
        </p>
        <a href="${loginUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 28px; background-color: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px;">
          Login to HRMS
        </a>
      </div>
      <div style="background-color: #f9f9f9; padding: 16px; text-align: center; font-size: 12px; color: #aaa;">
        This is an automated email. Please do not reply.
      </div>
    </div>
    `;

    await transporter.sendMail({
        from: `"HRMS" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: "Your HRMS Account Credentials",
        html,
    });
};
