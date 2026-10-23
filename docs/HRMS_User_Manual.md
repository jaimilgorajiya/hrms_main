# 📘 HRMS — Human Resource Management System
## Enterprise User Manual & Operating Guide

**Product Version:** 2026 | **Document Type:** Official User Manual | **Audience:** All User Roles  
**Last Updated:** October 2026 | **Classification:** Internal / Client Distribution

---

> [!IMPORTANT]
> This document is the official operating guide for the HRMS multi-tenant SaaS platform. It covers all modules, user roles, and workflows. Keep this document accessible to all HR personnel, managers, and system administrators.

---

## 📋 Table of Contents

| Section | Topic |
|---------|-------|
| **SECTION 1** | [System Overview & Getting Started](#section-1-system-overview--getting-started) |
| **SECTION 2** | [Company Configuration & Global Master Data](#section-2-company-configuration--global-master-data) |
| **SECTION 3** | [Employee Lifecycle Management](#section-3-employee-lifecycle-management) |
| **SECTION 4** | [Shift, Timing & Policy Configuration](#section-4-shift-timing--policy-configuration) |
| **SECTION 5** | [Attendance & Time Tracking](#section-5-attendance--time-tracking) |
| **SECTION 6** | [Leave & Holiday Management](#section-6-leave--holiday-management) |
| **SECTION 7** | [Payroll, Salary & CTC Management](#section-7-payroll-salary--ctc-management) |
| **SECTION 8** | [Document & Compliance Management](#section-8-document--compliance-management) |
| **SECTION 9** | [Employee Self-Service (ESS) — Mobile App & Web](#section-9-employee-self-service-ess--mobile-app--web) |
| **SECTION 10** | [WhatsApp Conversational HR Bot](#section-10-whatsapp-conversational-hr-bot) |
| **SECTION 11** | [SaaS Packages, Licensing & System Admin](#section-11-saas-packages-licensing--system-admin) |

---

---

# SECTION 1: System Overview & Getting Started

---

## 1.1 Introduction to the HRMS Platform

### Overview & Purpose

The HRMS (Human Resource Management System) is a full-stack, multi-tenant SaaS platform that consolidates every aspect of workforce management into a single, unified solution. It is designed for businesses of all sizes — from startups to large enterprises with multiple branches.

The platform eliminates manual HR processes by automating:
- **Attendance tracking** with GPS geofencing and anti-spoof verification
- **Payroll calculation** with integrated leave, penalty, and tax deductions
- **Employee lifecycle** from onboarding to offboarding
- **Self-service access** via Mobile App and WhatsApp Bot
- **Compliance management** with document verification workflows

### Business Value Proposition

| Benefit | Description |
|---------|-------------|
| **Zero Paper** | All HR operations digitized end-to-end |
| **Real-Time Visibility** | Live attendance dashboard, missing punch alerts |
| **Multi-Branch Ready** | Manage unlimited branches from one portal |
| **Mobile-First** | Employees operate entirely from their smartphones |
| **WhatsApp Native** | HR Bot requires zero app installation |
| **Audit-Ready** | Complete logs of all payroll, attendance, and document actions |

### Technology Architecture

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express 5, MongoDB (Mongoose 9), Socket.io 4 |
| **Frontend** | React 18, Vite 7, React Router 7, Recharts |
| **Authentication** | JWT (30-day tokens) + HTTP-only cookies, Firebase OTP (mobile) |
| **Payments** | Razorpay (subscriptions + add-on purchases) |
| **PDF Generation** | pdfmake (payslips), pdfkit (offboarding documents) |
| **Email** | Nodemailer (SMTP) |
| **WhatsApp** | Meta WhatsApp Cloud API |
| **Scheduler** | node-cron (attendance emails, retirement reminders) |
| **Real-Time** | Socket.io (admin live notifications) |

---

## 1.2 Accessing the System: Web Portal, Mobile Web App, and WhatsApp Bot

### Web Portal (Admin & Manager)

The primary admin interface is a React SPA accessible from any modern browser.

| Environment | URL Pattern |
|-------------|-------------|
| **Admin Dashboard** | `https://yourdomain.com/admin` |
| **Login Page** | `https://yourdomain.com/login` |
| **Registration** | `https://yourdomain.com/register` |

**Supported Browsers:** Chrome 95+, Firefox 90+, Edge 95+, Safari 15+

> [!NOTE]
> Employees **cannot** log into the web portal. Web access is restricted to Admin and Manager roles only. This is enforced at the backend authentication layer.

### Mobile Web App (Employee)

Employees access their self-service portal at the `/employee` and `/mobile` routes:

| Route | Description |
|-------|-------------|
| `/employee/dashboard` | Employee dashboard with quick actions |
| `/mobile/dashboard` | Mobile-optimized dashboard |
| `/mobile/attendance` | Punch In / Punch Out interface |

### WhatsApp Bot

No installation required. Employees simply message the company's registered WhatsApp number to access all HR functions. The bot supports:
- Attendance punching
- Leave applications
- Salary slip downloads
- Attendance regularization

> [!TIP]
> WhatsApp Bot is ideal for field staff, remote workers, and employees without smartphones with reliable data connectivity for app use.

---

## 1.3 User Roles & Permission Matrix

The system enforces a strict 4-tier role hierarchy:

| Role | Access Level | Portal Access | Key Capabilities |
|------|-------------|---------------|-----------------|
| **Master Admin** | System-wide (cross-tenant) | Web Portal | Manage all client companies, SaaS packages, billing |
| **Admin** | Company-wide | Web Portal | Full HR operations: employees, payroll, attendance, documents |
| **Manager** | Team/Department | Web Portal (restricted) | Team attendance, leave approvals, regularizations, promotions |
| **Employee** | Self only | Mobile App / WhatsApp | Punch, leave requests, payslips, document uploads |

### Detailed Permission Matrix

| Feature | Master Admin | Admin | Manager | Employee |
|---------|:---:|:---:|:---:|:---:|
| View all companies | ✅ | ❌ | ❌ | ❌ |
| Manage SaaS packages | ✅ | ❌ | ❌ | ❌ |
| Company configuration | ✅ | ✅ | ❌ | ❌ |
| Add/edit employees | ✅ | ✅ | ❌ | ❌ |
| View team attendance | ✅ | ✅ | ✅ | ❌ |
| Approve leave requests | ✅ | ✅ | ✅ | ❌ |
| Generate payroll | ✅ | ✅ | ❌ | ❌ |
| View own payslip | ❌ | ❌ | ❌ | ✅ |
| Punch In/Out | ❌ | ❌ | ❌ | ✅ |
| Apply for leave | ❌ | ❌ | ❌ | ✅ |
| Upload documents | ❌ | ❌ | ❌ | ✅ |

> [!IMPORTANT]
> All data in the system is scoped by `adminId`. An Admin can only see their own company's data. Multi-tenant isolation is enforced at every database query level.

---

## 1.4 Initial Company Registration & SaaS Package Selection

### Overview & Purpose

New companies register through the self-service signup page at `/register`. This triggers a Razorpay payment flow to select and activate a subscription package.

### Step-by-Step: Company Registration

1. **Navigate** to `https://yourdomain.com/register`
2. **Fill in Company Information:**
   - Company Name
   - Admin Email Address
   - Admin Password (minimum 8 characters)
   - Mobile Number
3. **Select a SaaS Package:** A package selection modal will appear showing available plans with employee limits and feature flags.
4. **Complete Payment via Razorpay:**
   - Click **"Subscribe & Pay"**
   - The Razorpay checkout modal opens
   - Complete payment using Credit/Debit Card, UPI, or Net Banking
5. **Payment Verification:**
   - The backend automatically verifies the payment signature via Razorpay webhook
   - On successful verification, the Admin account is activated
   - A `Client` record is created linking the Admin account to the selected package
6. **First Login:**
   - Navigate to `/login`
   - Enter the registered email and password
   - You will be redirected to the Admin Dashboard at `/admin`

### Field Definitions

| Field | Mandatory | Format | Description |
|-------|:---:|-------|-------------|
| Company Name | ✅ | Text | Legal or trading name of the company |
| Admin Email | ✅ | Valid email | Used for login and all system notifications |
| Password | ✅ | Min 8 chars | Admin portal login password |
| Mobile Number | ✅ | 10 digits | Used for account recovery |
| Package | ✅ | Selection | Defines employee limits and feature access |

> [!WARNING]
> Do not close the browser during Razorpay payment. If interrupted, the payment may be captured but the account may not be activated. Contact support with your Razorpay Order ID for manual resolution.

---

## 1.5 First-Time Login, Password Reset, and Profile Configuration

### First-Time Login

1. Navigate to `/login`
2. Enter your **Email** and **Password**
3. Click **Sign In**
4. On success, you are redirected to the **Admin Dashboard**

### Password Reset (Forgot Password)

1. Click **"Forgot Password?"** on the login page
2. Enter your registered email address
3. Click **Send Reset Link**
4. Check your inbox for a password reset email (valid for 24 hours)
5. Click the link in the email → redirected to `/reset-password`
6. Enter and confirm your new password
7. Click **Reset Password** → login with new credentials

### Changing Password (Logged In)

1. Navigate to **Admin Profile** (`/admin/profile`)
2. Click **Change Password**
3. Enter current password, new password, and confirm new password
4. Click **Update Password**

> [!NOTE]
> Password reset links expire after 24 hours. If your link has expired, repeat the "Forgot Password" process.

---

---

# SECTION 2: Company Configuration & Global Master Data

---

## 2.1 Company Profile & Branding

### Overview & Purpose

The Company Profile is the foundation of your HRMS setup. It stores your organization's identity, branding, and legal details, which are used across payslips, letters, and system communications.

**Navigation:** `Admin Panel → Company → Company Details`

### Step-by-Step Configuration

1. Go to **Admin → Company → Company Details**
2. Fill in or update the following fields:
   - **Company Name:** Your organization's legal name
   - **Company Logo:** Upload a PNG/JPG (recommended: 200×200px, max 2MB)
   - **Address:** Full registered address
   - **City, State, Country, PIN Code**
   - **GST Number / Tax Identification:** For payslip compliance
   - **Contact Email & Phone**
3. Click **Save Company Details**

### Field Definitions

| Field | Mandatory | Format | Description |
|-------|:---:|-------|-------------|
| Company Name | ✅ | Text | Appears on payslips and all generated documents |
| Company Logo | ❌ | Image file | Displayed on dashboard header and payslips |
| Registered Address | ✅ | Text | Full postal address |
| GST/Tax Number | ❌ | Alphanumeric | For statutory compliance in payslip PDF |
| Contact Email | ✅ | Valid email | Official HR contact email |

> [!TIP]
> Upload a high-resolution company logo. It will be embedded in all PDF salary slips and offboarding letters. A blurry logo reflects poorly on corporate documents sent to employees.

---

## 2.2 Branch Management

### Overview & Purpose

The Branch module allows multi-location organizations to define separate offices or sites. Each branch has its own geolocation coordinates and geofencing radius, which powers the anti-spoof GPS attendance verification.

**Navigation:** `Admin Panel → Company → Branches`

### Step-by-Step: Adding a Branch

1. Navigate to **Company → Branches**
2. Click **Add Branch**
3. Fill in the branch details:
   - **Branch Name** (e.g., "Mumbai HQ", "Delhi Office")
   - **Address Line 1 & 2**
   - **City, State, Country, PIN**
   - **Latitude:** GPS latitude of the office location
   - **Longitude:** GPS longitude of the office location
   - **Geofencing Radius (meters):** The allowed radius within which employees can punch in/out
4. Click **Save Branch**

### Field Definitions

| Field | Mandatory | Format | Description |
|-------|:---:|-------|-------------|
| Branch Name | ✅ | Text | Unique name for this location |
| Address | ✅ | Text | Physical address |
| Latitude | ✅ | Decimal (e.g., 19.0760) | GPS coordinate — get from Google Maps |
| Longitude | ✅ | Decimal (e.g., 72.8777) | GPS coordinate — get from Google Maps |
| Geofencing Radius | ✅ | Integer (meters) | Recommended: 50–200m for office buildings |

### How to Get GPS Coordinates

1. Open [Google Maps](https://maps.google.com)
2. Right-click on your office building
3. Click the coordinates shown at the top of the context menu (e.g., `19.0760, 72.8777`)
4. Paste the first number as Latitude and the second as Longitude

> [!WARNING]
> If Latitude/Longitude are incorrectly configured, employees will be blocked from punching in even when physically present at the office. Always verify coordinates after saving by asking a test user to punch in from the actual location.

### Inter-Branch Transfer

Employees can be transferred between branches. See **Section 3.6** for the complete transfer workflow.

---

## 2.3 Department Master

### Overview & Purpose

Departments organize employees into functional groups (e.g., Engineering, Finance, HR). Each department is tied to a specific branch.

**Navigation:** `Admin Panel → Company → Departments`

### Step-by-Step: Creating a Department

1. Navigate to **Company → Departments**
2. Click **Add Department**
3. Enter:
   - **Department Name** (e.g., "Web Development", "Accounts")
   - **Select Branch** (the branch this department belongs to)
   - **Department Head** (optional — assign a manager)
4. Click **Save**

### Field Definitions

| Field | Mandatory | Description |
|-------|:---:|-------------|
| Department Name | ✅ | Functional group name |
| Branch | ✅ | Associated branch |
| Department Head | ❌ | Employee assigned as HOD |

> [!NOTE]
> When adding an employee, the Department dropdown is filtered by the selected Branch. Ensure departments are created for each branch before adding employees.

---

## 2.4 Designation Master

### Overview & Purpose

Designations define job titles and roles within the organization (e.g., "Software Engineer", "Senior Manager"). They are used in employee profiles, payslips, and promotion records.

**Navigation:** `Admin Panel → Company → Designations`

### Step-by-Step

1. Navigate to **Company → Designations**
2. Click **Add Designation**
3. Enter **Designation Name** (e.g., "Senior Software Engineer")
4. Optionally assign a **Level/Grade** for hierarchy
5. Click **Save**

> [!TIP]
> Keep designation names consistent with your organization's official HR policies. They appear verbatim on payslips, promotion letters, and offer letters.

---

## 2.5 Employee ID Format Configurator

### Overview & Purpose

The Employee ID Format Configurator allows you to define a standardized, auto-incrementing employee ID format. This ensures consistent, unique identifiers across your organization.

**Navigation:** `Admin Panel → Company → Employee ID Format`

### Step-by-Step Configuration

1. Navigate to **Company → Employee ID Format**
2. Configure the format components:
   - **Prefix:** Text that appears before the ID number (e.g., `EMP`, `IFLORA`)
   - **Separator:** Character between prefix and number (e.g., `-`, `_`, or none)
   - **Starting Number:** The sequence start value (e.g., `0001`, `1001`)
   - **Padding:** Number of digits with leading zeros (e.g., 4 digits → `0001`)
   - **Suffix:** Optional text after the number
3. **Preview:** The system shows a live preview of the generated ID
4. Click **Save Format**

### Examples

| Prefix | Separator | Start | Padding | Result |
|--------|-----------|-------|---------|--------|
| EMP | - | 1 | 4 | EMP-0001 |
| IFLORA | - | 4 | 4 | IFLORA-0004 |
| HR | _ | 100 | 3 | HR_100 |

> [!NOTE]
> When adding a new employee, the system auto-generates the next sequential ID based on this format. You can override it manually during employee creation, but the auto-generated ID is recommended for consistency.

### Bulk ID Updater

If you need to change employee IDs in bulk (e.g., after a company rebrand):
1. Navigate to **Employees → Bulk Update IDs**
2. Download the current ID template CSV
3. Update the IDs in the spreadsheet
4. Upload the modified file
5. Review the preview and confirm

---

## 2.6 Management Roles & Fine-Grained Permissions

### Overview & Purpose

Beyond the standard Admin/Manager/Employee roles, you can create custom management roles with specific access scopes for your organization structure.

**Navigation:** `Admin Panel → Company → Manage Roles`

### Step-by-Step

1. Navigate to **Company → Manage Roles**
2. Click **Add Role**
3. Enter:
   - **Role Name** (e.g., "Branch Manager", "Payroll Officer")
   - **Description**
   - **Permission Set:** Select which modules this role can access
4. Click **Save**
5. Assign the role to employees through their profile

---

## 2.7 Retirement Settings & Automated Retirement Notifications

### Overview & Purpose

Configure the retirement age for your organization. The system automatically monitors approaching retirements and sends email notifications to HR administrators well in advance.

**Navigation:** `Admin Panel → Settings → Retirement Settings`

### Step-by-Step Configuration

1. Navigate to **Settings → Retirement Settings**
2. Set the **Retirement Age** (default: 60 years)
3. Configure **Advance Notification Days** — how many days before retirement to alert HR
4. Click **Save**

### Viewing Upcoming Retirements

1. Navigate to **Employees → Upcoming Retirements**
2. The system lists all employees approaching retirement within the configured notification window
3. Filter by **Branch** or **Department**
4. Export the list as CSV for succession planning

> [!IMPORTANT]
> Retirement notifications are sent via automated cron jobs. Ensure SMTP email configuration is correctly set up (see backend `.env` setup) for notifications to be delivered.

---

## 2.8 Daily Automated Attendance Email Triggers

### Overview & Purpose

The system can automatically send daily attendance summary emails to designated administrators, providing a no-login-required daily snapshot.

**Navigation:** `Admin Panel → Settings → Daily Attendance Email`

### Configuration

1. Navigate to **Settings → Daily Attendance Email**
2. Enable the **Daily Email Trigger** toggle
3. Set the **Trigger Time** (recommended: 8:00 PM or end-of-business)
4. Add **Recipient Emails** (can be multiple admins or external stakeholders)
5. Configure the **Email Content:** Total present, absent, on leave, late arrivals
6. Click **Save**

The cron job runs daily at the configured time and sends attendance summaries without any manual intervention.

> [!NOTE]
> The cron job runs in IST (Indian Standard Time) by default. Adjust the timezone configuration in `backend/utils/cronJobs.js` if your company operates in a different timezone.

---

---

# SECTION 3: Employee Lifecycle Management

---

## 3.1 Employee Directory

### Overview & Purpose

The Employee Directory is the central registry of all active, inactive, and ex-employees across all branches. It provides real-time search, filtering, and quick-access to individual profiles.

**Navigation:** `Admin Panel → Employees → Employee List`

### Features

- **Search:** By name, Employee ID, email, or phone number
- **Filters:** Branch, Department, Designation, Employment Type, Status
- **Multi-Branch View:** Toggle between branches or view all branches simultaneously
- **Quick Actions:** View profile, edit, change status, transfer branch

### Employee Status Types

| Status | Description |
|--------|-------------|
| **Active** | Currently employed and operational |
| **Onboarding** | Recently added, document verification pending |
| **Inactive** | Temporarily deactivated (e.g., long leave) |
| **Resigned** | Resignation submitted, serving notice period |
| **Ex-Employee** | Employment fully terminated |
| **Retired** | Retired from service |
| **Absconding** | Left without formal process |

---

## 3.2 Adding an Employee (Multi-Tab Wizard)

### Overview & Purpose

The Add Employee wizard captures all necessary information across a single comprehensive form, creating the employee profile and automatically sending credentials to their email.

**Navigation:** `Admin Panel → Employees → Add Employee`

### Prerequisites

Before adding an employee, ensure the following master data is configured:
- ✅ At least one **Branch** exists
- ✅ At least one **Department** exists for that Branch
- ✅ At least one **Designation** exists
- ✅ At least one **Shift** is configured
- ✅ At least one **Leave Group** is created

> [!WARNING]
> If your SaaS package employee limit has been reached, the Add Employee page will display a "Employee Limit Reached" banner. You must upgrade your plan or purchase an employee add-on before proceeding.

### Step-by-Step: Adding an Employee

**Step 1: Profile Photo**
- Click the camera icon on the profile photo placeholder
- Upload a clear face photo (JPG/PNG, max 5MB)
- The photo is used for face detection during attendance punching

**Step 2: Core Identification Fields**

| Field | Mandatory | Description |
|-------|:---:|-------------|
| Employee ID | ❌ | Auto-generated from format; can override |
| Designation | ✅ | Select from Designation Master |
| Branch | ❌ | Assign to a branch |
| Department | ✅ | Filtered by selected Branch |
| Shift | ❌ | Assign default work shift |
| Leave Group | ✅ | Determines leave allocation policy |

**Step 3: Personal Information**

| Field | Mandatory | Description |
|-------|:---:|-------------|
| First Name | ✅ | Employee's legal first name |
| Last Name | ✅ | Employee's legal last name |
| Alias Name | ❌ | Preferred/nick name |
| Country Code | ✅ | Phone country code (default: +91) |
| Mobile No. | ✅ | Used for WhatsApp Bot and OTP login |
| Date of Birth | ✅ | YYYY-MM-DD format |
| Email ID | ✅ | Work email; used for credentials and notifications |
| Gender | ✅ | Male / Female |

**Step 4: Employment Details**

| Field | Mandatory | Description |
|-------|:---:|-------------|
| Date of Joining | ✅ | Official joining date |
| Probation Period Days | ❌ | Duration of probation (e.g., 90 days) |
| Training Completion Date | ❌ | Auto-calculated from joining + probation days |
| Date of Permanent Employee | ❌ | Auto-calculated; can override |
| Employment Type | ✅ | Full Time / Part Time / Contract / Intern |

> [!TIP]
> When you enter the **Date of Joining** and **Probation Period Days**, the system automatically calculates and pre-fills the **Training Completion Date** and **Date of Permanent Employee** fields. You can still manually adjust these dates.

**Step 5: Advanced Fields (Optional)**

| Field | Description |
|-------|-------------|
| Sub Department | Secondary department classification |
| Grade | Salary/seniority grade |
| Employee Level | Hierarchical level |
| Biometric ID | Integration ID for biometric devices |
| Previous Member ID | For transferred or rehired employees |
| Insurance Number | Group insurance member number |
| Insurance Company Name | Insurer name |
| Insurance Expiry Date | Policy expiry |
| Retirement Age | Override global retirement age for this employee |

**Step 6: Attendance Method Selection**

Two mutually exclusive options:

| Option | Description |
|--------|-------------|
| **Mandatory Face Detection** | Employee must take a selfie during punch in/out. Disables WhatsApp punching. |
| **Allow WhatsApp Attendance** | Employee can punch via WhatsApp Bot. Disables face detection requirement. |

> [!IMPORTANT]
> These two options are mutually exclusive. Enabling Face Detection automatically disables WhatsApp punch, and vice versa. WhatsApp-based leave requests, salary slip access, and reports remain available regardless of which option is selected.

**Step 7: Submit**
- Click the **ADD** button
- On success, the system:
  - Creates the employee profile
  - Auto-sends login credentials to the employee's email
  - Redirects you to the Employee List

### Post-Creation Actions

After creation, an optional WhatsApp welcome message can be sent to the employee with their credentials if the `sendWhatsApp` flag is enabled.

---

## 3.3 Bulk Employee Import via Excel/CSV

### Overview & Purpose

Import multiple employees at once using a structured Excel/CSV template, saving hours of manual data entry.

**Navigation:** `Admin Panel → Employees → Bulk Import`

### Step-by-Step

1. Navigate to **Employees → Bulk Import** or download from **Employees → Sample Template**
2. Click **Download Sample CSV** to get the official import template
3. Fill the spreadsheet with employee data following the column headers
4. Save as CSV or Excel format
5. Return to **Employees → Bulk Import**
6. Click **Upload File** and select your filled spreadsheet
7. Review the **Preview Panel** showing parsed rows
8. Any validation errors will be highlighted with specific error messages
9. Fix errors in the spreadsheet and re-upload if needed
10. Click **Confirm Import** to create all employees in batch

### Common Import Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Email already exists" | Duplicate email in system | Check existing employees, use unique email |
| "Invalid date format" | Date not in YYYY-MM-DD | Reformat dates in spreadsheet |
| "Department not found" | Department name mismatch | Ensure department exists and name matches exactly |
| "Leave Group not found" | Leave group name not matching | Check Leave Groups list for exact names |

> [!TIP]
> For the initial bulk import, first complete all master data setup (branches, departments, designations, shifts, leave groups) before importing employees. The import will fail if referenced master data doesn't exist.

---

## 3.4 Employee 360° Profile View

### Overview & Purpose

The Employee Profile is a comprehensive, multi-tabbed view showing every aspect of an employee's history with the company.

**Navigation:** `Admin Panel → Employees → [Click any employee]`

### Profile Tabs

| Tab | Content |
|-----|---------|
| **Personal Details** | Full personal and contact information |
| **Job Information** | Designation, department, branch, employment type, dates |
| **Shift History** | Log of all shift assignments and changes |
| **Leave Balance** | Current leave balances by leave type |
| **CTC Log** | Full salary revision history with effective dates |
| **Documents** | Uploaded documents with verification status |
| **Attendance** | Recent attendance records summary |
| **Offboarding** | Exit process details (if applicable) |

---

## 3.5 Employee Onboarding Pipeline & Document Verification

### Overview & Purpose

The Onboarding Pipeline tracks new employees through the document collection and verification process, ensuring all compliance requirements are met before the employee becomes fully operational.

**Navigation:** `Admin Panel → Employees → Onboarding`

### Onboarding Status Flow

```
Added → Onboarding → Document Submitted → Documents Verified → Active
```

### Step-by-Step: Managing Onboarding

1. Navigate to **Employees → Onboarding**
2. View the list of employees in **Onboarding** status
3. Click an employee to see their **Document Checklist**
4. Required documents (configured in Document Settings) are shown as:
   - 🔴 **Missing** — not yet uploaded
   - 🟡 **Pending Review** — uploaded, awaiting admin review
   - 🟢 **Verified** — approved by admin
5. Once all mandatory documents are verified, manually update employee status to **Active**

### Configuring Required Onboarding Documents

1. Navigate to **Settings → Onboarding Document Settings**
2. Select which document types are mandatory for new employees
3. Save settings

> [!IMPORTANT]
> Configure onboarding document requirements before employees begin uploading. Documents uploaded before configuration is saved are still stored but won't appear in the mandatory checklist.

---

## 3.6 Inter-Branch Employee Transfer Workflow

### Overview & Purpose

Transfer an employee from one branch to another while preserving their complete history, leave balances, and records.

**Navigation:** `Admin Panel → Employees → [Employee Profile] → Change Branch`

### Step-by-Step

1. Open the employee's profile
2. Click **Change Branch** (or navigate to **Employees → Change Branch**)
3. Select the **Target Branch**
4. Select the **New Department** (filtered to the target branch)
5. Enter the **Transfer Effective Date**
6. Add an optional **Reason/Note**
7. Click **Confirm Transfer**

The system:
- Updates the employee's branch and department
- Logs the transfer in the employee's shift/branch history
- All historical records (attendance, payroll) remain linked to the old branch for that period

---

## 3.7 Employee Promotions & Designation Re-allocation

### Overview & Purpose

Record official promotion events including designation changes, salary revisions, and effective dates. Promotions create an immutable audit trail.

**Navigation:** `Admin Panel → Employees → Promotions`

### Step-by-Step

1. Navigate to **Employees → Promotions**
2. Click **Add Promotion**
3. Select the **Employee**
4. Fill in promotion details:
   - **Previous Designation** (auto-filled from profile)
   - **New Designation**
   - **Previous Salary / CTC** (auto-filled)
   - **New Salary / CTC**
   - **Effective Date**
   - **Promotion Remarks**
5. Click **Save Promotion**

The employee's designation and CTC are updated automatically from the effective date. A promotion letter can be generated from the profile.

---

## 3.8 Employee Resignation & Exit Management Lifecycle

### Overview & Purpose

Formally track and manage the resignation process from submission through the last working day.

**Navigation:** `Admin Panel → Employees → Resignation`

### Resignation Lifecycle

```
Resignation Submitted → Notice Period → Last Working Day → Offboarding Initiated
```

### Step-by-Step: Managing Resignation

1. Navigate to **Employees → Resignation**
2. Employee resignations are listed with current status
3. Click a resignation to **Review**:
   - **Resignation Date:** When resignation was submitted
   - **Last Working Day:** Calculated based on notice period
   - **Exit Type:** Resignation / Termination / Retirement / Absconding
   - **Reason:** Employee's stated reason
4. **Approve** or update the exit date
5. Once the last working day is reached, initiate the **Offboarding Process** (Section 3.9)

### Employee Self-Submission (Mobile App)

Employees can submit their resignation through the Mobile App (see Section 9.9). Admin receives an instant notification.

---

## 3.9 Offboarding Clearance, Asset Handover & Auto-Generated Letters

### Overview & Purpose

A structured checklist-based offboarding workflow ensures all clearances, asset handovers, and final settlements are completed before an employee exits.

**Navigation:** `Admin Panel → Employees → Offboarding`

### Offboarding Workflow

1. Navigate to **Employees → Offboarding**
2. Find the employee pending offboarding
3. The system presents a **Clearance Checklist:**
   - IT Equipment returned ✅
   - Access cards surrendered ✅
   - Finance settlement cleared ✅
   - HR documents completed ✅
   - Library/assets returned ✅
4. Each item is checked off as clearance is obtained from respective departments
5. Add any **Notes or Remarks** per clearance item
6. Once all items are cleared, click **Finalize Offboarding**
7. The system:
   - Changes employee status to `Ex-Employee` / `Resigned` / etc.
   - Sets the Exit Date
   - Generates an auto **Experience Letter** (PDF via pdfkit)
   - Generates a **Full & Final Settlement** document
8. Download and share documents with the departing employee

> [!IMPORTANT]
> Once offboarding is finalized, the employee record is moved to the Ex-Employee directory. Their historical data (payslips, attendance) remains intact and accessible.

---

## 3.10 Ex-Employee Directory & Reactivation Workflow

### Overview & Purpose

The Ex-Employee Directory maintains a complete record of all departed employees, supporting rehiring and audit requirements.

**Navigation:** `Admin Panel → Employees → Ex-Employees`

### Features

- Full searchable list of all former employees
- View complete historical profile and documents
- **Reactivate** a former employee (for rehires)

### Step-by-Step: Reactivating an Ex-Employee

1. Navigate to **Employees → Ex-Employees**
2. Search for the employee by name or ID
3. Click **Reactivate**
4. Confirm the reactivation
5. The system restores the employee to **Active** status
6. Assign them a new shift, leave group, and updated CTC if needed

> [!NOTE]
> Reactivated employees retain their previous Employee ID and all historical data. If you need to assign a new Employee ID, edit their profile after reactivation.

---

---

# SECTION 4: Shift, Timing & Policy Configuration

---

## 4.1 Shift Master

### Overview & Purpose

Shifts define the official working hours for your employees. Each shift has precise start/end times, half-day thresholds, overtime rules, and night shift flags.

**Navigation:** `Admin Panel → Shift → Manage Shifts`

### Step-by-Step: Creating a Shift

1. Navigate to **Shift → Manage Shifts**
2. Click **Add Shift**
3. Configure the shift parameters:

### Field Definitions

| Field | Mandatory | Format | Description |
|-------|:---:|-------|-------------|
| Shift Name | ✅ | Text | e.g., "Morning Shift", "Night Shift" |
| Shift Start Time | ✅ | HH:MM (24h) | Official start of the work shift |
| Shift End Time | ✅ | HH:MM (24h) | Official end of the work shift |
| Full Day Hours | ✅ | Hours (decimal) | Minimum hours to count as Full Day (e.g., 8.5) |
| Half Day Hours | ✅ | Hours (decimal) | Minimum hours to count as Half Day (e.g., 4.0) |
| Is Night Shift | ❌ | Toggle | Enable for shifts crossing midnight |
| Week Off Days | ✅ | Multi-select | Select off days (e.g., Saturday, Sunday) |
| Grace Time (In) | ❌ | Minutes | Late arrival tolerance before penalty starts |
| Grace Time (Out) | ❌ | Minutes | Early departure tolerance before penalty starts |

4. Click **Save Shift**

### Shift Examples

| Shift | Start | End | Full Day | Half Day |
|-------|-------|-----|----------|----------|
| Day Shift | 09:00 | 18:00 | 8.5 hrs | 4.0 hrs |
| Morning Shift | 07:00 | 15:00 | 7.5 hrs | 4.0 hrs |
| Night Shift | 22:00 | 06:00 | 7.5 hrs | 4.0 hrs |

> [!TIP]
> For night shifts that cross midnight (e.g., 22:00 to 06:00), always enable the **"Is Night Shift"** toggle. Without it, the system may miscalculate working hours.

---

## 4.2 Grace Time Rules

### Overview & Purpose

Grace time defines a tolerance window for late arrivals and early departures before penalties are applied. It prevents penalizing employees for minor deviations.

**Navigation:** `Admin Panel → Shift → Grace Time`

### Configuration

1. Navigate to **Shift → Grace Time**
2. Configure globally or per-shift:
   - **Punch-In Grace (minutes):** Time after shift start before "Late" is recorded (e.g., 10 minutes)
   - **Punch-Out Grace (minutes):** Time before shift end that early exit penalty kicks in
3. Click **Save**

### How Grace Time Works

```
Shift Start: 09:00 AM
Grace Time: 10 minutes
→ Employees arriving before 09:10 AM are marked "On Time"
→ Employees arriving after 09:10 AM are marked "Late"
```

---

## 4.3 Penalty Rules & Deduction Slabs

### Overview & Purpose

Penalty rules automatically calculate monetary deductions or half-day marks when employees arrive late, leave early, or work insufficient hours.

**Navigation:** `Admin Panel → Shift → Penalty Rules`

### Penalty Types

| Penalty Type | Trigger | Effect |
|-------------|---------|--------|
| **Late Arrival Penalty** | Arriving after grace time | Per-minute deduction or fixed amount |
| **Early Exit Penalty** | Leaving before shift end | Per-minute deduction or fixed amount |
| **Auto Half Day** | Working below half-day threshold | Marks attendance as Half Day |
| **Auto Absent** | Working below minimum threshold | Marks as Absent |

### Step-by-Step: Configuring Penalty Rules

1. Navigate to **Shift → Penalty Rules**
2. Click **Add Rule** or select a shift to configure
3. Define penalty slabs:
   - **Slab 1:** Late by 1–30 mins → Deduction: ₹50 / 0.5 day
   - **Slab 2:** Late by 31–60 mins → Deduction: ₹100 / 1 day
   - **Slab 3:** Late by 60+ mins → Auto Half Day
4. Enable **Auto Half Day Rule:** If punched hours < Half Day threshold
5. Enable **Auto Absent Rule:** If no punch recorded by cut-off time
6. Click **Save Rules**

### Penalty Integration with Payroll

Accumulated penalty deductions are automatically included in the monthly payroll calculation. See **Section 7.5** for payroll-penalty integration.

> [!NOTE]
> The **Penalties List** page (`Admin → Payroll → Penalties`) provides a detailed month-wise report of all penalties recorded per employee, which can be reviewed before finalizing payroll.

---

## 4.4 Break Type Management

### Overview & Purpose

Break Types define the different kinds of breaks employees can take (e.g., lunch break, tea break, emergency break). Each break type has a defined duration window that does not count as work time.

**Navigation:** `Admin Panel → Shift → Break Types`

### Step-by-Step

1. Navigate to **Shift → Break Types**
2. Click **Add Break Type**
3. Configure:
   - **Break Type Name** (e.g., "Lunch Break", "Tea Break")
   - **Duration (minutes):** Standard length of the break
   - **Maximum per Day:** How many times this break type can be used per day
   - **Deductible:** Whether break time is deducted from total work hours
4. Click **Save**

### Common Break Type Examples

| Break Type | Duration | Max/Day | Deductible |
|-----------|---------|---------|-----------|
| Lunch Break | 30 min | 1 | Yes |
| Tea Break | 10 min | 2 | No |
| Emergency Break | 30 min | 1 | Yes |

---

---

# SECTION 5: Attendance & Time Tracking

---

## 5.1 Real-Time Daily Attendance Log

### Overview & Purpose

The Daily Attendance Log provides a real-time view of all employee attendance for any given day, including punch times, work duration, break duration, and attendance status.

**Navigation:** `Admin Panel → Attendance → Daily Records`

### Reading the Attendance Log

| Column | Description |
|--------|-------------|
| Employee | Name and Employee ID |
| Branch | Branch assignment |
| Punch In | Recorded arrival time |
| Punch Out | Recorded departure time |
| Work Hours | Total productive hours (excluding breaks) |
| Break Duration | Total break time |
| Status | Present / Absent / Half Day / On Leave / Holiday |
| Late By | Minutes late beyond grace time |
| Penalties | Auto-calculated penalty flag |

### Filtering Options

- **Date:** View any specific date or date range
- **Branch:** Filter by specific branch
- **Department:** Filter by department
- **Status:** Filter by attendance status
- **Employee:** Search by specific employee

### Export

Click **Export CSV** or **Export PDF** to download the filtered attendance data.

---

## 5.2 Anti-Spoof Hardware GPS Punch Verification Engine

### Overview & Purpose

The system includes a multi-layer anti-spoof attendance verification engine to prevent fraudulent GPS location spoofing via mock GPS apps.

**Navigation:** Automatic — operates during every Punch In/Out event

### Verification Layers

| Layer | Check | Action on Failure |
|-------|-------|-------------------|
| **Geofence Check** | Employee location within branch radius | Punch blocked with "Out of Range" message |
| **Mock GPS Detection** | `isMocked` flag from device GPS | Flagged as suspicious; punch may be blocked |
| **Time Drift Validation** | Server time vs. client time (max 60-second drift) | Punch rejected if time tampering detected |
| **Month Lock** | Published payroll months locked | No attendance edits allowed for locked months |

### PunchVerify Page

Admins can view the **Punch Verification Log** (`Admin → Attendance → Punch Verify`) to see all flagged suspicious punches with:
- Employee details
- Claimed location
- Actual verified location
- Mock GPS flag status
- Resolution action taken

> [!WARNING]
> Enabling GPS mock detection is strongly recommended for all field-based and remote employees. Disable it only for employees in locations where GPS signal is unreliable (e.g., basement offices) — and use face-detection selfie as the alternative.

---

## 5.3 Manual Attendance Entry & HR Adjustments

### Overview & Purpose

Admins can manually add, edit, or delete attendance records to correct system errors or handle exceptional situations.

**Navigation:** `Admin Panel → Attendance → Add Attendance`

### Step-by-Step: Adding Manual Attendance

1. Navigate to **Attendance → Add Attendance**
2. Select the **Employee**
3. Select the **Date**
4. Enter:
   - **Punch In Time**
   - **Punch Out Time**
   - **Status** (override if needed)
   - **Note/Reason** for manual entry
5. Click **Save**

> [!IMPORTANT]
> Manual attendance entries bypass geofence and GPS verification. They should only be used for legitimate corrections such as system outages, device failures, or approved exceptions. All manual entries are logged with the admin's identity for audit purposes.

### Deleting an Attendance Record

1. Navigate to **Attendance → Delete Attendance**
2. Search for the specific record
3. Select the record(s)
4. Click **Delete** and confirm

> [!WARNING]
> Attendance records cannot be added or deleted for months where payroll has been **Published** (locked). The system will block the action with a "Month Locked" error.

---

## 5.4 Attendance Regularization & Missed Punch Approval System

### Overview & Purpose

When employees miss a punch (forget to punch in or out), they submit a regularization request with the correct times and a reason. HR reviews and approves or rejects these requests.

**Navigation:** `Admin Panel → Attendance → Pending Requests`

### Regularization Workflow

```
Employee submits missed punch request
        ↓
Request appears in Admin "Pending Requests" list
        ↓
Admin reviews: date, claimed punch times, reason
        ↓
    Approved?
    ├── Yes → Attendance record updated with provided times
    │         Employee notified via WhatsApp
    └── No  → Request rejected with remark
              Employee notified via WhatsApp
```

### Step-by-Step: Processing Regularization Requests

1. Navigate to **Attendance → Pending Requests** (or **Punch Request**)
2. Review each pending regularization:
   - **Employee Name & ID**
   - **Date of Issue**
   - **Requested Punch In Time**
   - **Requested Punch Out Time**
   - **Reason Provided**
3. Click **Approve** or **Reject**
4. For rejections, enter a **Remark** explaining the reason
5. Click **Confirm**

The employee receives an instant WhatsApp notification with the decision.

---

## 5.5 Monthly Attendance Matrix / Sheet

### Overview & Purpose

The Monthly Attendance Sheet provides a calendar-grid view of each employee's entire month, showing daily attendance status at a glance.

**Navigation:** `Admin Panel → Attendance → Monthly Attendance`

### Reading the Monthly Matrix

- **Rows:** Each employee
- **Columns:** Each calendar day (1–31)
- **Cell Color/Symbol:**
  - 🟢 **P** — Present
  - 🔴 **A** — Absent
  - 🟡 **HD** — Half Day
  - 🔵 **L** — On Leave
  - ⚪ **H** — Holiday
  - ⚫ **WO** — Week Off

### Filters

- **Month/Year selector**
- **Branch filter**
- **Department filter**
- **Employee search**

### Export

Export the full monthly matrix as **CSV** or **PDF** for sharing with management or payroll processing.

---

## 5.6 Bulk Attendance Fix / Recalculation Utility

### Overview & Purpose

When system errors cause incorrect Half Day calculations (e.g., after a shift change or grace time update), the Bulk Recalculate utility re-processes all attendance records for a given period.

**Navigation:** `Admin Panel → Attendance → Fix Attendance`

### Step-by-Step

1. Navigate to **Attendance → Fix Attendance**
2. Select the **Month/Year** to recalculate
3. Optionally filter by **Branch** or **Department**
4. Click **Recalculate Attendance**
5. Review the summary of changes made
6. Confirm to apply

> [!CAUTION]
> This utility overwrites calculated statuses. Run it only when you are certain the underlying shift/penalty configurations are correct. Do not run it for months where payroll is already Published (locked months are protected).

---

## 5.7 Absent Employees Tracker & Real-Time Missing Punches Alert

### Overview & Purpose

Proactively monitor employees who are absent today or have not punched in as expected.

### Absent Employees

**Navigation:** `Admin Panel → Attendance → Absent Employees`

- Displays all employees with no punch record for **today**
- Filter by Branch and Department
- Admins can initiate a manual attendance correction from this view
- Export the absent list as CSV

### Missing Punches Alert

**Navigation:** `Admin Panel → Attendance → Missing Punches`

Shows employees who have punched IN but have no corresponding punch OUT (or vice versa) — indicating a missing punch that may need regularization.

---

## 5.8 Attendance Analytics, Custom Date-Range Reports & CSV/PDF Export

### Overview & Purpose

Comprehensive analytics and reporting for attendance patterns, penalty trends, and workforce productivity.

**Navigation:** `Admin Panel → Attendance → Reports`

### Available Reports

| Report | Description |
|--------|-------------|
| **Daily Summary Report** | Present, absent, late, on leave counts for any day |
| **Monthly Attendance Report** | Full month summary per employee |
| **Late Arrival Report** | Employees with repeated late arrivals |
| **Early Exit Report** | Employees leaving before shift end |
| **Penalty Report** | Accumulated penalties per employee |
| **Custom Date Range** | Any start-end date attendance analytics |

### Exporting Reports

- Click **Export CSV** for spreadsheet analysis
- Click **Export PDF** for formatted, shareable reports
- All exports include filters applied (branch, department, date range)

---

---

# SECTION 6: Leave & Holiday Management

---

## 6.1 Leave Type Master

### Overview & Purpose

Leave Types define the categories of leave available in your organization. Each leave type has specific rules governing whether it is paid, how many days are allowed, and carryforward policies.

**Navigation:** `Admin Panel → Leave → Leave Types`

### Standard Leave Types

| Leave Type | Paid | Description |
|-----------|:---:|-------------|
| Paid Leave (PL) | ✅ | Annual earned leave |
| Casual Leave (CL) | ✅ | Short notice, personal reasons |
| Sick Leave (SL) | ✅ | Medical/health related |
| Maternity Leave | ✅ | Statutory maternity benefit |
| Loss of Pay (LOP) | ❌ | Unpaid leave |
| Compensatory Off | ✅ | Offset for extra work days |

### Step-by-Step: Creating a Leave Type

1. Navigate to **Leave → Leave Types**
2. Click **Add Leave Type**
3. Configure:
   - **Leave Type Name:** e.g., "Casual Leave"
   - **Is Paid:** Toggle for paid/unpaid
   - **Color Code:** For calendar display
   - **Requires Approval:** Always Yes for enterprise use
   - **Allow Half Day:** Toggle to allow half-day applications
   - **Requires Document:** For medical leave, require a sick certificate
4. Click **Save**

---

## 6.2 Leave Groups & Accrual Rules

### Overview & Purpose

Leave Groups bundle multiple Leave Types together with allocation quantities and accrual rules. Different employee grades or branches can have different Leave Groups.

**Navigation:** `Admin Panel → Leave → Leave Groups`

### Key Leave Group Settings

| Setting | Description |
|---------|-------------|
| **Leave Group Name** | e.g., "Corporate Policy", "Field Staff Policy" |
| **Is Paid Leave** | Whether this group's default leave is paid |
| **Leave Allocation Type** | Annual (lump sum) / Monthly accrual |
| **No. of Paid Leaves** | Annual entitlement (e.g., 18 days) |
| **Max Use Per Month** | Monthly limit on paid leaves (e.g., 4 days/month) |
| **Leave Restrictions** | Minimum advance notice required |
| **Carry Forward Policy** | Whether unused leaves carry to next year |
| **Year-End Balance Policy** | Encashment / Lapse / Carry Forward |
| **Leave Balance Visibility** | Whether employees can see their balance |

### Step-by-Step: Creating a Leave Group

1. Navigate to **Leave → Leave Groups**
2. Click **Add Leave Group**
3. Fill in all group parameters
4. Click **Save**

> [!IMPORTANT]
> Leave Groups must be created and configured before adding employees. The Leave Group assignment drives all leave balance calculations, auto-split logic, and WhatsApp Bot leave operations.

---

## 6.3 Bulk Leave Allocation & Individual Allotments

### Overview & Purpose

Allocate annual or monthly leaves to employees individually or in bulk at the start of a leave year.

**Navigation:** `Admin Panel → Leave → Assign Leaves` / `Bulk Assign`

### Bulk Leave Allocation

1. Navigate to **Leave → Bulk Assign Leave**
2. Select the **Leave Group**
3. Select **Branch** and **Department** (or "All")
4. Set the **Allocation Period** (e.g., Financial Year 2026-27)
5. Set the **Number of Days** to allocate
6. Review the employee list that will be affected
7. Click **Allocate to All**

### Individual Leave Assignment

1. Navigate to **Leave → Assign Individual Leave**
2. Select the **Employee**
3. Select the **Leave Type**
4. Enter the **Number of Days**
5. Enter the **Effective From** and **Effective To** dates
6. Add a note
7. Click **Assign**

---

## 6.4 Employee Leave Balance Portfolio & Real-Time Balance Tracking

### Overview & Purpose

View real-time leave balances for all employees across all leave types.

**Navigation:** `Admin Panel → Leave → Leave Balance`

### Leave Balance View

The Leave Balance page shows:
- Employee name and ID
- Leave Group assigned
- Per leave type: Total Allocated / Used / Remaining
- Current month usage vs. monthly limit

> [!TIP]
> Filter the Leave Balance view by Branch and Department to quickly identify departments with high leave consumption patterns and plan workforce coverage accordingly.

---

## 6.5 Leave Application & Approval Workflow

### Overview & Purpose

Employees submit leave requests through the Mobile App or WhatsApp Bot. Admins and managers review and approve or reject these through the Admin Portal.

**Navigation:** `Admin Panel → Leave → Requests` (or `Attendance → Pending Requests`)

### Leave Approval Workflow

```
Employee submits leave request (Mobile App / WhatsApp Bot)
        ↓
Request lands in Admin Requests Queue (status: Pending)
        ↓
Reporting Manager receives WhatsApp alert (if configured)
        ↓
Admin/Manager reviews request:
  - Leave Type, Duration (Full Day / Half Day / Date Range)
  - Reason
  - Available balance check
        ↓
    Decision:
    ├── Approved → Balance deducted, employee notified via WhatsApp
    └── Rejected → Rejection remark sent to employee via WhatsApp
```

### Step-by-Step: Processing Leave Requests

1. Navigate to **Leave → Requests** or **Attendance → Pending Requests**
2. Filter by **Status: Pending**
3. Click a request to view full details
4. Review:
   - Employee name, leave type, dates
   - Current leave balance (shown beside the request)
   - Reason provided
5. Click **Approve** or **Reject**
6. For rejection, enter a mandatory **Remark**
7. Click **Confirm**

The employee immediately receives a WhatsApp notification with the decision.

---

## 6.6 Auto-Split Engine (Automatic Paid vs. Unpaid Distribution)

### Overview & Purpose

The Auto-Split Engine automatically calculates how a long leave request should be divided between paid and unpaid leaves when the request exceeds the employee's available paid balance or monthly quota.

**How It Works:**

When an employee applies for 8 days of leave and their monthly limit is 5 days:

```
Requested: 8 days (20-Sep to 27-Sep)
Monthly Paid Quota Available: 5 days

Auto-Split Result:
├── Paid Leave: 5 days (20-Sep to 24-Sep)
└── Unpaid Leave (LOP): 3 days (25-Sep to 27-Sep)
```

The system:
- Creates **two linked leave requests** — one paid, one unpaid
- Deducts only the paid portion from the annual balance
- Flags the unpaid portion for payroll LOP deduction
- Shows the employee the exact split before they confirm

> [!NOTE]
> The Auto-Split Engine considers both the **Monthly Limit** and the **Annual Balance** simultaneously. It splits based on whichever limit is hit first.

---

## 6.7 Holiday Calendar Management

### Overview & Purpose

Define official company holidays that automatically mark those dates as non-working days across attendance and leave calculations.

**Navigation:** `Admin Panel → Leave → Holiday Calendar`

### Holiday Types

| Type | Description |
|------|-------------|
| **Company-Wide Holiday** | Applies to all branches (e.g., Republic Day) |
| **Branch-Specific Holiday** | Applies to specific branches (e.g., regional festivals) |

### Step-by-Step: Adding Holidays

1. Navigate to **Leave → Holiday Calendar**
2. Click **Add Holiday**
3. Enter:
   - **Holiday Name** (e.g., "Diwali")
   - **Date**
   - **Type:** Company-Wide or Branch-Specific
   - **Branch** (if branch-specific)
   - **Recurring:** Toggle if this is an annual recurring holiday
4. Click **Save**

### Bulk Holiday Upload

For the full annual calendar:
1. Click **Bulk Upload**
2. Download the holiday template CSV
3. Fill in all holidays with dates and names
4. Upload the filled CSV
5. Review and confirm

> [!TIP]
> Set up the entire annual holiday calendar at the beginning of the financial year. This enables accurate leave balance calculations, attendance reports, and WhatsApp bot responses throughout the year.

---

---

# SECTION 7: Payroll, Salary & CTC Management

---

## 7.1 Earning & Deduction Catalog

### Overview & Purpose

The Earning & Deduction Catalog defines all salary components — what employees earn and what gets deducted. This catalog forms the building blocks of every pay structure in the system.

**Navigation:** `Admin Panel → Payroll → Earning & Deduction Types`

### Standard Components

**Earnings:**

| Component | Type | Description |
|-----------|------|-------------|
| Basic Salary | Earning | Core compensation (typically 40–50% of CTC) |
| HRA (House Rent Allowance) | Earning | Housing allowance (typically % of Basic) |
| DA (Dearness Allowance) | Earning | Cost of living adjustment |
| Conveyance Allowance | Earning | Travel reimbursement |
| Medical Allowance | Earning | Health-related allowance |
| Special Allowance | Earning | Discretionary top-up |
| Bonus | Earning | Performance or statutory bonus |

**Deductions:**

| Component | Type | Description |
|-----------|------|-------------|
| PF (Provident Fund) | Deduction | Statutory 12% of Basic |
| ESI (Employee State Insurance) | Deduction | Statutory for salary < ₹21,000 |
| TDS (Tax Deducted at Source) | Deduction | Income tax deduction |
| PT (Professional Tax) | Deduction | State-level professional tax |
| Advance Recovery | Deduction | Salary advance repayment |
| Custom Deduction | Deduction | Any organization-specific deduction |

### Step-by-Step: Adding a Component

1. Navigate to **Payroll → Earning & Deduction Types**
2. Click **Add Component**
3. Configure:
   - **Name:** e.g., "HRA"
   - **Type:** Earning or Deduction
   - **Calculation Method:** Fixed Amount / Percentage of Basic / Percentage of Gross
   - **Statutory:** Toggle if this is a legally mandated component
4. Click **Save**

---

## 7.2 Salary Groups & Pay Structures

### Overview & Purpose

Salary Groups bundle earning and deduction components into reusable pay structures. Employees are assigned to a Salary Group, which defines the formula for their payslip.

**Navigation:** `Admin Panel → Payroll → Salary Groups`

### Step-by-Step: Creating a Salary Group

1. Navigate to **Payroll → Salary Groups**
2. Click **Add Salary Group**
3. Enter **Group Name** (e.g., "Technical Staff — Grade A")
4. Add components from the Earning & Deduction Catalog:
   - Select component (e.g., Basic, HRA, PF)
   - Set the value or percentage for each
5. Preview the sample payslip structure
6. Click **Save**

---

## 7.3 Employee CTC Management

### Overview & Purpose

CTC (Cost-to-Company) management allows you to set, revise, and track the complete salary package for each employee, with a full revision history for audit and compliance.

**Navigation:** `Admin Panel → Payroll → Employee CTC`

### CTC Breakup Configuration

1. Navigate to **Payroll → Employee CTC**
2. Select the **Employee**
3. Click **Add CTC / Revise Salary**
4. Configure:
   - **Effective Date:** When this CTC takes effect
   - **Annual CTC / Monthly CTC:** Enter gross package
   - **Salary Group:** Select the applicable salary group
   - The system automatically calculates each component
5. Review the **CTC Breakup:**
   - Gross Salary
   - Net Salary (after deductions)
   - Employer PF contribution
   - Total CTC
6. Click **Save**

### CTC History

Click **View CTC History** on any employee profile to see the full salary revision log with:
- Previous CTC amounts
- New CTC amounts
- Effective dates
- Revision remarks

> [!NOTE]
> The system includes a **Salary Manipulation Prevention** feature: when generating payslips, the backend recalculates net salary independently and rejects any frontend value that differs by more than ₹2. This prevents tampering with payslip amounts.

---

## 7.4 Payroll Settings & Tax Slabs

### Overview & Purpose

Configure tax calculation rules, Professional Tax slabs, and other payroll-wide settings that affect all salary calculations.

**Navigation:** `Admin Panel → Payroll → Payroll Settings`

### Configuration Options

| Setting | Description |
|---------|-------------|
| **TDS Calculation Method** | Old Tax Regime / New Tax Regime |
| **Professional Tax Slabs** | State-wise slab configuration |
| **PF Calculation Basis** | On Basic / On Basic + DA |
| **ESI Threshold** | Salary below which ESI applies |
| **Payroll Cycle** | Monthly (standard) |

---

## 7.5 Attendance & Penalty Integration with Payroll

### Overview & Purpose

Payroll automatically imports attendance data, approved leaves, and calculated penalties to determine each employee's net payable salary for the month.

### LOP (Loss of Pay) Calculation

```
Working Days in Month: 26
Employee Present Days: 18
Approved Paid Leaves: 3
Holidays: 2
Week Offs: 3

Paid Days = Present Days + Approved Paid Leaves + Holidays + Week Offs
         = 18 + 3 + 2 + 3 = 26 ✅ (Full month)

LOP Days = Working Days - Paid Days = 0

If employee only has:
Paid Days = 18 + 1 + 2 + 3 = 24
LOP Days = 26 - 24 = 2
LOP Deduction = (Monthly CTC / 26) × 2
```

### Penalty Integration

All penalty amounts calculated from the Penalty Rules engine (Section 4.3) are automatically included as deductions in the payroll calculation for that month.

---

## 7.6 Generating Monthly Salary Slips (Batch Processing)

### Overview & Purpose

The payroll generation process computes each employee's salary for the selected month based on attendance, leaves, penalties, and CTC.

**Navigation:** `Admin Panel → Payroll → Generate Salary Slip`

### Step-by-Step: Generating Payroll

1. Navigate to **Payroll → Generate Salary Slip**
2. Select the **Month** and **Year** (e.g., September 2026)
3. Click **Load Summary** — the system calculates:
   - Present days, absent days, LOP days
   - Penalty deductions
   - Gross earnings, deductions, net pay
4. Review the summary table for each employee
5. Verify individual records:
   - Click any employee row to see the detailed calculation breakdown
   - Check for anomalies (unusual LOP, zero pay, etc.)
6. For each employee (or in bulk), click **Initiate Payout**
   - Status changes to **"Initiated"**

> [!IMPORTANT]
> Review the payroll summary carefully before initiating. Once payslips are Published (Section 7.7), the month is locked and attendance records cannot be modified.

---

## 7.7 Publishing Salary Slips & Releasing to Employees

### Overview & Purpose

Publishing makes payslips visible to employees and triggers automatic WhatsApp PDF delivery.

**Navigation:** `Admin Panel → Payroll → Publish Salary Slip`

### Step-by-Step: Publishing Payroll

1. Navigate to **Payroll → Publish Salary Slip**
2. Select the Month/Year
3. Review the list of employees with "Generated" status
4. **Review PDF Preview:** Click the PDF preview icon for any employee to verify the slip before publishing
5. Select all or specific employees
6. Click **Publish All** or **Publish Selected**
7. Confirm the publish action

**On Publishing:**
- Payslip status changes to **"Published"** (month is now **LOCKED**)
- All published employees immediately receive their **PDF payslip via WhatsApp**
- Employees can view and download their payslip from the Mobile App/Employee Portal

### Payroll Status Lifecycle

```
Initiated → Generated → Published (LOCKED)
```

> [!WARNING]
> Publishing is **irreversible** and locks the month for attendance edits. Do not publish until all attendance corrections and leave approvals are finalized. If an error is found post-publish, contact system administrator for manual correction.

---

## 7.8 Payslip Generation & Corporate PDF Download

### Overview & Purpose

Each published payslip generates a professional PDF with full salary breakdown, company branding, and statutory compliance details.

### Payslip PDF Contents

| Section | Details |
|---------|---------|
| **Header** | Company logo, name, address |
| **Employee Details** | Name, ID, designation, department, branch |
| **Pay Period** | Month and year |
| **Earnings Table** | All earning components with amounts |
| **Deductions Table** | All deductions with amounts |
| **Summary** | Gross Earnings, Total Deductions, Net Pay |
| **Attendance** | Working days, present days, LOP days |
| **Statutory** | PF, ESI, TDS summary |

### Downloading Payslips (Admin)

1. Navigate to **Payroll → Payout History**
2. Filter by month and employee
3. Click the **Download PDF** icon next to any employee's record

---

## 7.9 Payout History & Disbursement Auditing

### Overview & Purpose

The Payout History provides a complete audit trail of all salary disbursements, filterable by month, employee, and status.

**Navigation:** `Admin Panel → Payroll → Payout History`

### Features

- Filter by **Month/Year**, **Employee**, **Status** (Initiated/Generated/Published)
- View full calculation details per record
- Download individual or bulk payslip PDFs
- Identify discrepancies between initiated and published amounts
- Export full history as CSV for accounting reconciliation

---

---

# SECTION 8: Document & Compliance Management

---

## 8.1 Document Category Master

### Overview & Purpose

The Document Category Master defines the types of documents the system can collect from employees.

**Navigation:** `Admin Panel → Documents → Document Types`

### Standard Document Categories

| Category | Examples |
|----------|---------|
| **KYC** | Aadhaar Card, PAN Card, Passport, Voter ID |
| **Education** | Degree Certificate, Mark Sheets, Diplomas |
| **Experience** | Previous Employer Letters, Relieving Letters |
| **Bank Proof** | Bank Passbook, Cancelled Cheque, Bank Statement |
| **Tax** | Form 16, Income Tax Returns |
| **Medical** | Medical Certificate, Fitness Certificate |

### Step-by-Step: Adding a Document Type

1. Navigate to **Documents → Document Types**
2. Click **Add Document Type**
3. Enter:
   - **Document Name** (e.g., "Aadhaar Card")
   - **Category** (KYC / Education / Experience / Bank / Tax)
   - **Is Mandatory for Onboarding:** Toggle if required during joining
   - **Accepted File Types:** PDF, JPG, PNG (configure max size)
4. Click **Save**

---

## 8.2 Mandatory Onboarding Document Configuration

### Overview & Purpose

Configure which specific documents are mandatory for an employee to complete the onboarding process.

**Navigation:** `Admin Panel → Settings → Onboarding Document Settings`

### Step-by-Step

1. Navigate to **Settings → Onboarding Document Settings**
2. Select which document types are **mandatory** for new employees
3. Optionally configure branch-specific or designation-specific requirements
4. Click **Save Settings**

---

## 8.3 Admin Document Verification, Approval & Rejection Workflow

### Overview & Purpose

HR admins review submitted employee documents and approve or reject them with specific remarks.

**Navigation:** `Admin Panel → Documents → Document Approval`

### Document Status Lifecycle

```
Employee Uploads Document
        ↓
Status: "Pending Review"
        ↓
Admin Reviews Document
        ↓
    Decision:
    ├── Approved → Status: "Verified" ✅
    └── Rejected → Status: "Rejected" ❌ (with rejection reason)
                   Employee notified to re-upload
```

### Step-by-Step: Document Review

1. Navigate to **Documents → Document Approval**
2. Filter by **Status: Pending** to see documents awaiting review
3. Click a document to view the full uploaded file
4. Review the document for:
   - Legibility and completeness
   - Authenticity markers
   - Correct document type
5. Click **Approve** or **Reject**
6. For rejection, enter a clear **Rejection Reason** to guide the employee
7. Click **Confirm**

---

## 8.4 Secure Employee Document Repository

### Overview & Purpose

All uploaded employee documents are stored in a secure, organized repository accessible only to authorized HR admins.

**Navigation:** `Admin Panel → Documents → All Documents`

### Features

- View all documents for all employees in one centralized view
- Filter by employee, document type, status, date range
- Download individual documents
- View document verification history

> [!NOTE]
> Documents are stored on the server's file system under the `public/uploads` directory (or the path specified in `UPLOAD_DIR` environment variable). Ensure this directory has proper backup and access controls configured in production.

---

---

# SECTION 9: Employee Self-Service (ESS) — Mobile App & Web

---

## 9.1 Mobile Web & App Login (Firebase OTP & Credentials)

### Overview & Purpose

Employees access the HRMS through a mobile-optimized web interface or the native React Native mobile app. Login is secured via Firebase OTP on the phone number registered in the system.

### Login Flow

1. Open the HRMS Mobile App or navigate to the mobile web URL
2. Enter your **Registered Phone Number**
3. Click **Send OTP**
   - Firebase sends a 6-digit OTP via SMS to the registered number
4. Enter the **OTP** within the 60-second window
5. Click **Verify OTP**
6. On success, you are logged in and redirected to the **Employee Dashboard**

> [!IMPORTANT]
> The phone number used for OTP login must be the **exact same number** registered in your employee profile by HR. If you receive "Phone not registered" error, contact HR to verify your registered number.

---

## 9.2 Employee Dashboard

### Overview & Purpose

The Employee Dashboard is the home screen of the self-service portal, providing a quick snapshot of the employee's current status, actions, and balances.

**Navigation:** `/employee/dashboard` or `/mobile/dashboard`

### Dashboard Components

| Widget | Description |
|--------|-------------|
| **Today's Status** | Current attendance status (Punched In / Out / Absent) |
| **Quick Punch Button** | One-tap Punch In or Punch Out |
| **Leave Balance** | Available paid leave days remaining |
| **Upcoming Holidays** | Next public holidays |
| **Pending Requests** | Leave requests awaiting approval |
| **Recent Payslips** | Last 3 published salary slips |
| **Company Notices** | HR announcements and notices |

---

## 9.3 Geofenced Attendance Punching (Punch In / Out, Break Tracker)

### Overview & Purpose

Employees punch their attendance from their smartphones. The system verifies their GPS location against the assigned branch's geofence before allowing the punch.

**Navigation:** `/mobile/attendance` or `/employee/attendance`

### Punch In Process

1. Tap **Punch In** button on the dashboard or attendance page
2. The browser/app requests **location permission** — tap **Allow**
3. The system:
   - Captures your current GPS coordinates
   - Validates against the assigned branch's geofence
   - Checks for GPS mock/spoof detection
4. If within the geofence: **Punch In Successful** ✅
5. Your punch time is recorded with the exact timestamp

### Punch Out Process

1. Tap **Punch Out** on the dashboard
2. Confirm GPS permission if prompted
3. Optionally enter a **Daily Work Report** summary
4. Punch is recorded with calculated work hours

### Break Management

1. Tap **Start Break** to begin a break
2. Select Break Type (Lunch / Tea / Emergency)
3. Tap **End Break** when returning
4. Break duration is tracked and excluded from total work hours

### Error Messages

| Error | Cause | Resolution |
|-------|-------|-----------|
| "You are outside the geofence" | GPS shows you are outside the branch radius | Move closer to the office or contact HR |
| "Mock GPS detected" | GPS spoofing app detected on device | Disable mock GPS apps; use real location |
| "Already punched in" | Duplicate punch attempt | Your earlier punch is recorded; proceed normally |
| "Time sync error" | Device time is out of sync | Sync device time to automatic/internet time |

> [!WARNING]
> Do not use third-party GPS mock apps or location spoofing tools. The system detects these and may flag your attendance as fraudulent. Repeated violations may result in disciplinary action.

---

## 9.4 Leave Applications & Status Tracking

### Overview & Purpose

Employees apply for leave directly from the mobile app and track approval status in real-time.

**Navigation:** Employee Portal → Leave → Apply Leave

### Step-by-Step: Applying for Leave

1. Navigate to **Leave → Apply Leave**
2. Select **Leave Type** (Casual Leave, Sick Leave, etc.)
3. Select **Duration:**
   - Full Day
   - First Half (morning off)
   - Second Half (afternoon off)
4. Enter **From Date** and **To Date**
5. Enter **Reason**
6. Upload supporting document (for sick leave if required)
7. Review the **auto-calculated leave split** (if applicable)
8. Tap **Submit**

### Tracking Status

- Navigate to **Leave → My Leave Requests**
- View all submitted requests with current status:
  - 🟡 **Pending** — awaiting approval
  - 🟢 **Approved** — approved by HR/manager
  - 🔴 **Rejected** — rejected with reason
  - ⚪ **Cancelled** — cancelled by employee

---

## 9.5 Missed Punch / Attendance Regularization Request

### Overview & Purpose

If you forgot to punch in or out, submit a regularization request with the correct times for HR approval.

**Navigation:** Employee Portal → Attendance → Regularization

### Step-by-Step

1. Navigate to **Attendance → Regularization Request**
2. Select the **Date** with the missed punch
3. Enter your actual **Punch In Time**
4. Enter your actual **Punch Out Time** (or mark as missing)
5. Enter **Reason** for the missed punch
6. Tap **Submit Request**

Your request appears in the HR portal for review. You will receive a WhatsApp notification when it is approved or rejected.

---

## 9.6 Viewing & Downloading Monthly Payslip PDFs

### Overview & Purpose

Employees can access and download all their published payslips from the mobile portal.

**Navigation:** Employee Portal → Payslips

### Step-by-Step

1. Navigate to **Payslips** in the Employee Portal
2. Browse the list of published payslips by month
3. Tap a month to view the **payslip details**
4. Tap **Download PDF** to save the payslip to your device

> [!NOTE]
> Only payslips with **Published** status are visible to employees. If you don't see a particular month's payslip, it may not have been published yet by HR. Contact HR for status.

---

## 9.7 Document Uploads & Verification Status

### Overview & Purpose

Employees upload their KYC, educational, and other required documents through the mobile portal for HR verification.

**Navigation:** Employee Portal → Documents

### Step-by-Step: Uploading a Document

1. Navigate to **Documents**
2. Tap **Upload Document**
3. Select **Document Type** from the dropdown
4. Tap **Choose File** and select the document from your device
5. Tap **Upload**

### Viewing Verification Status

The document list shows the verification status of each uploaded document:
- 🟡 **Pending Review** — HR has not reviewed yet
- 🟢 **Verified** — Approved by HR
- 🔴 **Rejected** — Rejected; see rejection reason and re-upload

---

## 9.8 Viewing Assigned Shift & Company Holiday Calendar

### Overview & Purpose

Employees can view their assigned shift timings and the company's holiday calendar from the mobile portal.

**Navigation:** Employee Portal → My Shift / Holiday Calendar

### Shift Information

- **Shift Name**
- **Start Time & End Time**
- **Week Off Days**
- **Grace Time window**
- **Break Types available**

### Holiday Calendar

- Full month/year calendar view
- Company-wide and branch-specific holidays marked
- Tap any date to see the holiday name

---

## 9.9 Submitting Resignation & Tracking Notice Period

### Overview & Purpose

Employees can formally submit their resignation through the mobile app and track their notice period progress.

**Navigation:** Employee Portal → My Profile → Submit Resignation

### Step-by-Step: Submitting Resignation

1. Navigate to **My Profile → Resignation**
2. Tap **Submit Resignation**
3. Enter:
   - **Reason for Resignation**
   - **Requested Last Working Day**
4. Review the **Notice Period** details (based on your contract)
5. Tap **Submit**

A resignation notification is sent to HR immediately. You can track the status:
- **Submitted** — Resignation received, pending HR review
- **Under Review** — HR reviewing; last working day being confirmed
- **Accepted** — Resignation accepted; notice period begins
- **Offboarding In Progress** — Clearance process initiated

---

---

# SECTION 10: WhatsApp Conversational HR Bot

---

## 10.1 Overview & Meta Cloud API Integration

### Overview & Purpose

The HRMS WhatsApp Bot is a production-grade, conversational HR assistant that allows employees to perform all daily HR operations directly via WhatsApp — no app download, no login required.

### Architecture

```
Employee sends WhatsApp message
        ↓
Meta WhatsApp Cloud API
        ↓
HRMS Backend Webhook (/api/whatsapp/webhook)
        ↓
[Intent Detection Engine]
[Multi-Step State Machine (MongoDB Session)]
[Action Execution Layer]
        ↓
Response sent back via Meta Cloud API
        ↓
Employee receives response / PDF document
```

### Bot Design Philosophy

- **Zero emojis:** Clean, corporate, professional tone
- **Numbered commands:** Simple 1–8 shortcuts for common operations
- **Smart intent detection:** Keyword and natural language understanding
- **Privacy-first:** No internal database IDs exposed to users

### Meta Cloud API Setup (Administrator)

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Navigate to: **App → Products → WhatsApp Business Account → Configuration**
3. Click **Edit** under Webhooks
4. Set **Callback URL:** `https://yourdomain.com/api/whatsapp/webhook`
5. Set **Verify Token:** (as configured in your backend `.env`)
6. Click **Verify and Save**
7. Under **Webhook fields**, subscribe to: `messages`

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `WHATSAPP_TOKEN` | Meta System User Permanent Access Token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Phone Number ID |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification string |
| `APP_URL` | Your backend server's public URL |

---

## 10.2 Employee Phone Authentication & Security

### Overview & Purpose

The Bot identifies employees by their WhatsApp phone number and automatically resolves their full profile for secure, personalized responses.

### Phone Number Resolution Process

1. Incoming WhatsApp message is received
2. The system normalizes the phone number:
   - Strips special characters (+, -, spaces)
   - Converts Indian 10-digit numbers to `91XXXXXXXXXX` format
3. Queries the HRMS database for an employee with this phone/WhatsApp number
4. Pulls the full profile: branch, shift, leave group, manager, attendance settings

### Unregistered Numbers

If a message comes from an unregistered phone number, the bot responds:

> *"Your phone number is not registered in the HRMS system. Please contact HR to register your phone number."*

---

## 10.3 Core Chatbot Commands Guide

### Quick Reference Command Menu

| Number | Command | Trigger Keywords |
|--------|---------|-----------------|
| **1** | Punch In | `punch in`, `check in`, `checkin`, `signin`, `login`, `1` |
| **2** | Punch Out & Daily Report | `punch out`, `checkout`, `signout`, `logout`, `2` |
| **3** | Today's Attendance Status | `attendance`, `today`, `status`, `3` |
| **4** | Monthly Attendance Summary | `monthly attendance`, `monthly report`, `4` |
| **5** | Leave Balance Portfolio | `balance`, `leave balance`, `my leaves`, `5` |
| **6** | Apply Leave | `apply leave`, `take leave`, `leave request`, `6` |
| **7** | Salary Slip PDF | `salary slip`, `payslip`, `salary`, `7` |
| **8** | Attendance Regularization | `regularize`, `missed punch`, `correction`, `8` |

---

### Command 1: Punch In (with Geolocation Verification)

**Trigger:** `punch in` or send `1`

**Flow:**
1. Employee sends "punch in" on WhatsApp
2. Bot validates WhatsApp punch authorization for this employee
3. Checks if already punched in today
4. Records attendance with current IST timestamp
5. Detects late arrival against shift start time

**Sample Bot Response:**
```
Punch In Successful

Employee: Rahul Sharma
Time: 09:30 am
Date: 02-10-2026
Status: On Time (Shift: 09:00 AM - 06:30 PM)
```

> [!NOTE]
> WhatsApp punch is only available for employees where the "Allow WhatsApp Attendance Punch" option is enabled in their profile. Employees configured for "Mandatory Face Detection" cannot punch via WhatsApp.

---

### Command 2: Punch Out & Daily Summary Report

**Trigger:** `punch out` or send `2`

**Flow:**
1. Bot verifies an active Punch-In exists for today
2. Initiates 2-step conversation:
   - **Step 1:** Bot asks for the employee's Daily Work Report summary
   - **Step 2:** Employee sends their work summary text
3. Bot records punch-out time and computes total working minutes
4. Detects early departure if punched out before shift end

**Sample Bot Response:**
```
Punch Out Successful

Employee: Rahul Sharma
Time: 06:30 pm
Total Working Hours: 9 hrs 0 mins
Daily Report: Completed project documentation and client review calls.
```

---

### Command 3: Today's Attendance Status Check

**Trigger:** `attendance`, `today`, `status`, or send `3`

**Sample Bot Response:**
```
Today's Attendance Status — 02 Oct 2026

Employee: Rahul Sharma
Status: Present
Punch In: 09:30 am
Punch Out: 06:30 pm
Total Hours: 9 hrs 0 mins
```

---

### Command 4: Monthly Attendance Summary

**Trigger:** `monthly attendance`, `monthly report`, `4`, or `monthly attendance september 2026`

**Flow:**
1. Parses requested month/year (defaults to current month)
2. Aggregates all attendance records, approved leaves, and holidays
3. Returns comprehensive summary

**Sample Bot Response:**
```
Monthly Attendance Report — September 2026

Employee: Rahul Sharma (EMP-0042)
Department: Engineering

Summary:
Total Working Days: 26
Present Days: 22
Half Days: 1
Paid Leaves: 2
Unpaid Leaves: 1
Absent Days: 0
Daily Average: 8 hrs 45 mins

Penalties & Deviations:
Late Arrivals: 1
Early Departures: 0
Missing Punches: 0
```

---

### Command 5: Leave Balance Portfolio

**Trigger:** `balance`, `leave balance`, `my leaves`, or send `5`

**Sample Bot Response:**
```
Leave Balance Portfolio

Employee: Rahul Sharma
Policy: Corporate Paid Leave Policy

Annual Paid Leaves:
Entitlement: 18.00 days
Used: 5.00 days
Remaining Balance: 13.00 days

Monthly Quota (October 2026):
Monthly Limit: 4.00 days
Used This Month: 0.00 days
Remaining This Month: 4.00 days
```

---

### Command 6: Apply Leave (with Half-Day and Date Range Options)

**Trigger:** `apply leave`, `take leave`, `6`

**Multi-Step Conversation Flow:**

```
Step 1: Bot shows available leave types (numbered list)
        → Employee replies with number (e.g., "1" for Casual Leave)

Step 2: Bot asks for duration:
        1. Full Day
        2. First Half (morning off)
        3. Second Half (afternoon off)
        → Employee replies with 1, 2, or 3

Step 3: Bot asks for From Date (DD-MM-YYYY)
        → Employee types date (e.g., 10-10-2026)

Step 4: Bot asks for To Date (DD-MM-YYYY) [skipped for Half Day]
        → Employee types date (e.g., 14-10-2026)

Step 5: Bot asks for Reason
        → Employee types reason

Step 6: Bot shows AUTO-SPLIT CONFIRMATION (if applicable):
        → Employee replies "yes" to confirm or "cancel" to abort

Step 7: Leave request submitted; manager notified via WhatsApp
```

**Sample Auto-Split Confirmation:**
```
Please confirm your leave request:

Leave Type: Paid Leave
Duration: Full Day
From: 20-10-2026
To: 27-10-2026 (8 days)
Reason: Family vacation

Auto-Split Policy Breakdown:
1. Paid Leave: 5 day(s) (20-10-2026 to 24-10-2026)
2. Unpaid Leave (LOP): 3 day(s) (25-10-2026 to 27-10-2026)
Note: Monthly Paid Leave quota (5 days/month) reached

Reply yes to confirm or cancel to abort.
```

> [!NOTE]
> The bot session has a **10–15 minute timeout**. If you take longer than this between steps, the conversation state is reset and you will need to start the leave application again.

---

### Command 7: Instant Salary Slip PDF Delivery

**Trigger:** `salary slip`, `payslip`, `7`, or `salary slip august 2026`

**Flow:**
1. Bot identifies the requested month (defaults to previous month)
2. Checks for a Published payslip for that month
3. Generates a PDF payslip buffer
4. **Sends the PDF directly to your WhatsApp chat**
5. Follows up with a text summary of Net Pay

**Sample Bot Response:**
```
Salary Slip — 2026-09

Employee: Rahul Sharma
Employee ID: EMP-0042
Department: Engineering
Net Pay: Rs. 45,000

Your PDF salary slip has been sent above.
```

> [!TIP]
> You can request any historical month's payslip, e.g., `salary slip june 2026`. The bot will retrieve and deliver the published payslip for that specific month if it's available.

---

### Command 8: Attendance Regularization / Missed Punch Request

**Trigger:** `regularize`, `missed punch`, `correction`, `8`

**Multi-Step Conversation Flow:**

```
Step 1: Bot asks for the date to correct (DD-MM-YYYY)
Step 2: Bot asks for actual Punch-In time (e.g., 09:30 or "skip")
Step 3: Bot asks for actual Punch-Out time (e.g., 06:30 PM or "skip")
        [Smart Detection: 06:30 for punch-out auto-resolves to PM]
Step 4: Bot asks for reason
Step 5: Bot shows confirmation and submits request
```

**Sample Submission Confirmation:**
```
Your attendance correction request has been submitted successfully!

Date: 02-10-2026
Punch-in: 09:30 am
Punch-out: 06:30 pm
Status: Pending (Awaiting HR Approval)

You will be notified once it is reviewed.
```

---

## 10.4 Automated WhatsApp Notifications

### Feature A: Shift Punch-In/Out Reminders

**Trigger:** Automated cron job running every 5 minutes (IST timezone)

**Punch-In Reminder:**
- Sent if: Current time is 15–60 minutes **after** shift start AND employee has not punched in
- Deduplication: Fires at most **once per employee per day**

```
Shift Reminder: You have not recorded your arrival attendance 
for today's shift (started at 09:00 AM). Please punch in on 
WhatsApp by replying 'punch in'.
```

**Punch-Out Reminder:**
- Sent if: Last punch is still "IN" and current time is 15–60 minutes **after** shift end

```
Shift Reminder: Your shift ended at 06:30 PM. Please record 
your departure attendance by replying 'punch out'.
```

---

### Feature B: Leave & Regularization Approval/Rejection Alerts

**Approved Leave:**
```
Leave Request Approved

Leave Type: Casual Leave
Duration: Full Day
From: 20-10-2026
To: 24-10-2026

Your leave has been recorded. Enjoy your time off.
```

**Rejected Leave:**
```
Leave Request Rejected

Leave Type: Casual Leave
From: 20-10-2026
To: 24-10-2026
Remark: Critical release scheduled

Your leave request was not approved. Please contact HR 
if you have any questions.
```

**Approved Attendance Correction:**
```
Attendance Correction Approved

Date: 02-10-2026
Punch-in: 09:30 am
Punch-out: 06:30 pm
Remark: Verified by Team Lead

Your attendance correction has been approved and your 
attendance record has been updated.
```

---

### Feature C: Manager Notification on Team Leave Requests

**Trigger:** When any employee submits a leave request (Web or WhatsApp)

**Manager Alert:**
```
New Leave Request — Action Required

Employee: Rahul Sharma (EMP-0042)
Leave Type: Casual Leave
Duration: Full Day
From: 20-10-2026
To: 24-10-2026
Reason: Going outstation

Please log in to the HRMS portal to approve or reject this request.
```

> [!NOTE]
> The reporting manager's WhatsApp number must be registered in their employee profile for this notification to be delivered.

---

### Feature D: Instant PDF Slip Delivery on Payroll Publishing

**Trigger:** When HR publishes payroll (individually or bulk)

The system automatically:
1. Generates each employee's payslip PDF
2. Sends the PDF directly to each employee's WhatsApp
3. Falls back to a text summary if document delivery fails

This eliminates the need for employees to manually download payslips — they receive it automatically the moment HR publishes.

---

---

# SECTION 11: SaaS Packages, Licensing & System Admin

---

## 11.1 SaaS Package Limits

### Overview & Purpose

The HRMS operates on a tiered subscription model. Each package defines the number of employees allowed, features enabled, storage limits, and validity period.

**Navigation:** `Admin Panel → Packages` (Admin view) | Master Admin Portal (Super Admin view)

### Package Dimensions

| Dimension | Description |
|-----------|-------------|
| **Employee Limit** | Maximum active employees allowed (e.g., 25, 100, Unlimited) |
| **Feature Flags** | Which modules are enabled (e.g., WhatsApp Bot, Advanced Reports) |
| **Storage Limit** | Total document storage (e.g., 5GB, 50GB) |
| **Validity Period** | Subscription duration (monthly/annual) |
| **Package Expiry** | Date when subscription expires |

### Employee Usage Indicator

When approaching the employee limit (within 3 remaining slots), the Add Employee page displays a **red usage bar** as a warning. At the limit, the page shows a full-screen "Employee Limit Reached" banner with an upgrade prompt.

### Checking Your Current Plan

1. Navigate to **Admin → My Profile / Account**
2. The **Package Information** section shows:
   - Current plan name
   - Employees used / Employees allowed
   - Expiry date
   - Available features

---

## 11.2 Upgrading Packages & Add-on Purchases via Razorpay

### Upgrading Your Subscription Plan

1. Navigate to **Admin → Account → Upgrade Plan**
2. Browse available plans
3. Select the target plan
4. Click **Upgrade**
5. Complete payment via Razorpay checkout (Card / UPI / Net Banking)
6. The new plan limits are applied **immediately** upon payment confirmation

### Purchasing Employee Add-On Packs

If you need more employees without changing your core plan:

1. Navigate to **Admin → Account → Add Employee Pack**
2. Select the add-on pack size (e.g., +10 employees, +50 employees)
3. Click **Purchase**
4. Complete Razorpay payment
5. Employee slots are added to your account immediately

> [!IMPORTANT]
> If your Razorpay payment succeeds but your plan is not updated, contact support with your **Razorpay Order ID** and **Payment ID** for manual resolution. Do not initiate duplicate payments.

---

## 11.3 System Audit Logs, Notifications & Security Best Practices

### In-App Notifications

The Admin portal includes a real-time notification bell (powered by Socket.io) that alerts admins to:
- New leave/regularization requests
- Employee document uploads
- System events

**Navigation:** Bell icon in the Admin Header

### Security Best Practices

#### For System Administrators

| Practice | Description |
|----------|-------------|
| **Strong Passwords** | Use minimum 12 characters with mixed case, numbers, symbols |
| **Regular Password Rotation** | Change admin passwords every 90 days |
| **JWT Token Management** | Tokens expire in 30 days; logging out invalidates the cookie |
| **SMTP Security** | Use TLS/SSL for email configuration |
| **Razorpay Keys** | Never use fallback test keys in production; configure via environment variables |
| **HTTPS Only** | Ensure your deployment uses SSL/TLS certificates |
| **Rate Limiting** | System enforces 5,000 requests per 15 minutes per IP |

#### For HR Admins

| Practice | Description |
|----------|-------------|
| **Document Access** | Only authorized HR personnel should have document download access |
| **Payroll Publishing** | Double-check all attendance corrections before publishing payroll (month lock) |
| **Employee Offboarding** | Complete all clearance steps before finalizing offboarding |
| **Geofence Settings** | Verify branch coordinates annually or after office relocations |

#### For Employees

| Practice | Description |
|----------|-------------|
| **No GPS Spoofing** | Using mock GPS apps is a policy violation and is detected |
| **OTP Security** | Never share your WhatsApp OTP with anyone, including HR |
| **Punch Honesty** | Punch times are timestamped and verified; discrepancies are flagged |

### Multi-Tenant Data Isolation

Every data record in the system is tagged with the company's `adminId`. This ensures:
- Admin A cannot view, modify, or access Admin B's data
- Compound unique indexes enforce data isolation at the database level: `{ email, adminId }`, `{ employeeId, adminId }`, `{ phone, adminId }`

### Cron Job Overview

| Job | Schedule | Purpose |
|-----|----------|---------|
| Daily Attendance Email | Configurable (default: 8 PM IST) | Sends attendance summary to admin |
| WhatsApp Punch Reminders | Every 5 minutes | Reminds employees to punch in/out |
| Retirement Reminders | Daily | Alerts HR of upcoming retirements |
| Auto-Status Updates | Daily (midnight) | Transitions resigned employees to Ex-Employee on exit date |

---

---

## 📎 Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **CTC** | Cost-to-Company — total annual salary package including all components |
| **LOP** | Loss of Pay — unpaid leave deducted from monthly salary |
| **Geofencing** | Virtual geographic boundary; attendance is only allowed within this radius |
| **Grace Time** | Tolerance window after shift start before a punch is marked "Late" |
| **Half Day** | Attendance status when working hours are between half-day and full-day thresholds |
| **Auto-Split** | Automatic distribution of a leave request between paid and unpaid leave |
| **Regularization** | HR-approved correction of a missed punch record |
| **Multi-Tenant** | Single platform serving multiple independent companies with data isolation |
| **ESIC** | Employee State Insurance Corporation — statutory health insurance |
| **PF** | Provident Fund — statutory retirement savings contribution |
| **PT** | Professional Tax — state-level employment tax |
| **TDS** | Tax Deducted at Source — income tax deducted by employer |
| **HRA** | House Rent Allowance — component of salary for housing expenses |
| **IST** | Indian Standard Time (UTC+5:30) |
| **OTP** | One-Time Password — temporary code for mobile authentication |

---

## 📎 Appendix B: Common Error Reference

| Error Message | Module | Cause | Resolution |
|--------------|--------|-------|-----------|
| "Employee Limit Reached" | Add Employee | Package employee quota exhausted | Upgrade plan or purchase add-on |
| "You are outside the geofence" | Attendance | GPS location outside branch radius | Move to office premises or contact HR |
| "Mock GPS detected" | Attendance | GPS spoofing app in use | Disable mock GPS; use real device location |
| "Month is locked" | Attendance/Payroll | Payroll published for this month | No attendance edits allowed; contact HR |
| "Phone not registered" | WhatsApp Bot/Mobile | Phone number not in HRMS | Contact HR to update your registered number |
| "Leave balance insufficient" | Leave | Requested days exceed available balance | Apply for LOP or reduce leave days |
| "Email already exists" | Employee Import | Duplicate email during bulk import | Use unique email for each employee |
| "Time sync error" | Attendance | Device time differs from server by >60 sec | Sync device time to automatic/network time |
| "Payment not verified" | Registration | Razorpay payment failed or incomplete | Retry payment; contact support with Order ID |

---

## 📎 Appendix C: Quick Navigation Reference

### Admin Panel Routes

| Page | URL Path |
|------|---------|
| Admin Dashboard | `/admin` |
| Employee List | `/admin/employees/list` |
| Add Employee | `/admin/employees/add` |
| Employee Onboarding | `/admin/employees/onboarding` |
| Employee Offboarding | `/admin/employees/offboarding` |
| Daily Attendance | `/admin/attendance/records` |
| Monthly Attendance | `/admin/attendance/monthly` |
| Pending Requests | `/admin/attendance/punch-request` |
| Absent Employees | `/admin/attendance/absent` |
| Leave Groups | `/admin/leave/group` |
| Leave Types | `/admin/leave/types` |
| Leave Balance | `/admin/leave/balance` |
| Holiday Calendar | `/admin/leave/holidays` |
| Shifts | `/admin/shift/manage` |
| Penalty Rules | `/admin/shift/penalty` |
| Grace Time | `/admin/shift/grace` |
| Employee CTC | `/admin/payroll/employee-ctc` |
| Generate Payroll | `/admin/payroll/generate-slip` |
| Publish Payroll | `/admin/payroll/publish-slip` |
| Payout History | `/admin/payroll/history` |
| Company Details | `/admin/company/details` |
| Branches | `/admin/company/branches` |
| Departments | `/admin/company/departments` |
| Designations | `/admin/company/designations` |
| Document Approval | `/admin/documents/approval` |
| Packages | `/admin/packages` |
| Resignations | `/admin/employees/resignations` |
| Promotions | `/admin/employees/promotions` |
| Ex-Employees | `/admin/employees/ex-employees` |
| Retirement Settings | `/admin/settings/retirement` |

---

*Document Version: 1.0 | Generated: October 2026 | HRMS Platform | Enterprise User Manual*  
*For technical support, contact your system administrator or the HRMS support team.*
