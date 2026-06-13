# 🏢 HRMS — Human Resource Management System

A full-stack, multi-tenant SaaS HRMS platform with attendance, payroll, leave management, onboarding/offboarding, and real-time notifications built with **Node.js/Express** (backend) and **React/Vite** (frontend).

---

## 📁 Project Structure

```
HRMS/
├── backend/               # Node.js + Express REST API
│   ├── config/            # Database connection
│   ├── controllers/       # Business logic (39 controllers)
│   ├── middleware/        # Auth, Upload, EmployeeLimit
│   ├── models/            # Mongoose schemas (35 models)
│   ├── routes/            # Express routes (37 route files)
│   ├── utils/             # Email, Cron, Socket, Attendance helpers
│   └── server.js          # Entry point
├── frontend/              # React 18 + Vite SPA
│   └── src/
│       ├── pages/         # 65+ admin pages + employee/mobile pages
│       ├── components/    # Shared components (Header, Sidebar, etc.)
│       ├── config/        # API base URL config
│       ├── layout/        # AdminLayout, EmployeeLayout
│       └── utils/         # apiHandler, authenticated fetch
└── mobile/                # React Native mobile app
```

---

## 🔧 Tech Stack

| Layer     | Technology                                                       |
|-----------|------------------------------------------------------------------|
| Backend   | Node.js, Express 5, MongoDB (Mongoose 9), Socket.io 4           |
| Frontend  | React 18, Vite 7, React Router 7, Recharts, Lucide React        |
| Auth      | JWT (30-day tokens) + HTTP-only cookies, Firebase OTP (mobile)  |
| Storage   | Multer (local disk), optional `UPLOAD_DIR` env override         |
| Payments  | Razorpay (subscription + add-on purchases)                      |
| PDF       | pdfmake (payslips), pdfkit (offboarding docs)                   |
| Email     | Nodemailer                                                       |
| Security  | Helmet, express-rate-limit, hpp, express-mongo-sanitize         |
| Realtime  | Socket.io (admin notifications)                                 |
| Scheduler | node-cron (daily attendance emails, retirement reminders)       |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18, MongoDB, Firebase project (for mobile OTP)

### Backend
```bash
cd backend
cp .env.example .env          # fill in required vars
npm install
npm run dev                   # nodemon server.js → port 7000
```

### Frontend
```bash
cd frontend
cp .env.example .env          # set VITE_API_URL if needed
npm install
npm run dev                   # vite → http://localhost:5173
```

### Required Environment Variables (Backend)
| Variable               | Description                                    |
|------------------------|------------------------------------------------|
| `PORT`                 | API server port (default 7000)                 |
| `MONGO_URI`            | MongoDB connection string                      |
| `JWT_SECRET`           | JWT signing secret                             |
| `CLIENT_URL`           | Frontend origin for CORS                       |
| `SMTP_*`               | Nodemailer SMTP config                         |
| `RAZORPAY_KEY_ID`      | Razorpay API key                               |
| `RAZORPAY_KEY_SECRET`  | Razorpay secret                                |
| `MASTER_ADMIN_EMAIL`   | Super-admin email bypass                       |
| `MASTER_ADMIN_API_KEY` | API key for master-admin bypass                |
| `FIREBASE_PROJECT_ID`  | Firebase credentials (if no serviceAccountKey) |

---

## 🔐 Authentication & Role System

| Role         | Access                                       |
|--------------|----------------------------------------------|
| Admin        | Full access to `/admin/*` routes             |
| Manager      | Access to `/manager-dashboard`               |
| Employee     | Web `/employee/*` + Mobile `/mobile/*`       |
| Master Admin | Cross-tenant super access via API key bypass |

**Important:** Employees **cannot** log into the web portal — only mobile/OTP. This is enforced on the backend login controller (`Auth.Controller.js` line 460–464).

---

## 🗺️ API Reference

### Auth — `/api/auth`
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | `/login`             | Email + password login (Admin/Manager) |
| POST   | `/register`          | Register new Admin account     |
| POST   | `/signup`            | Self-service signup with package selection + Razorpay |
| POST   | `/verify-payment`    | Razorpay payment webhook       |
| POST   | `/logout`            | Clear JWT cookie               |
| GET    | `/verify`            | Verify current user from token |
| POST   | `/change-password`   | Change own password            |
| POST   | `/forgot-password`   | Send reset link via email      |
| POST   | `/reset-password`    | Reset with token               |
| POST   | `/otp-login`         | Firebase OTP login (mobile)    |
| POST   | `/check-phone`       | Pre-check phone before OTP     |

### Users / Employees — `/api/users`
| Method | Endpoint                           | Description                        |
|--------|------------------------------------|------------------------------------|
| GET    | `/`                                | List all active employees (Admin)  |
| POST   | `/add-employee`                    | Create employee with file uploads  |
| GET    | `/ex-employees`                    | Ex-employee list                   |
| GET    | `/next-id`                         | Preview next auto employee ID      |
| GET    | `/:id`                             | Get single employee                |
| PUT    | `/:id`                             | Update employee                    |
| DELETE | `/:id`                             | Delete employee                    |
| PATCH  | `/:id/status`                      | Toggle active/inactive status      |
| POST   | `/:id/reactivate`                  | Reactivate ex-employee             |
| POST   | `/:id/documents`                   | Upload document for employee       |
| DELETE | `/:id/documents/:docId`            | Remove document                    |
| PUT    | `/:id/documents/:docId/review`     | Approve/reject document            |
| PUT    | `/:id/change-branch`               | Move employee to different branch  |
| DELETE | `/:id/profile-photo`               | Remove profile photo               |
| GET    | `/leave-balance`                   | Leave balance summary for all      |
| GET    | `/documents/all`                   | All uploaded documents (admin view)|
| POST   | `/bulk-update-ids`                 | Bulk update employee IDs           |
| GET    | `/import/sample`                   | Download CSV template              |
| POST   | `/import`                          | Bulk import via Excel/CSV          |

### Attendance — `/api/attendance`
| Method | Endpoint                              | Description                         |
|--------|---------------------------------------|-------------------------------------|
| GET    | `/today`                              | Employee: today's attendance record |
| POST   | `/toggle-punch`                       | Employee: punch IN/OUT              |
| POST   | `/toggle-break`                       | Employee: start/end break           |
| GET    | `/history`                            | Employee: attendance history        |
| GET    | `/admin/all`                          | Admin: all records (date or month)  |
| GET    | `/admin/absent-list`                  | Admin: absent employees today       |
| GET    | `/admin/missing`                      | Admin: employees with missing punch |
| POST   | `/admin/approve`                      | Admin: approve/reject attendance    |
| POST   | `/admin/add-manual`                   | Admin: add manual attendance        |
| GET    | `/admin/get-record`                   | Admin: specific employee record     |
| DELETE | `/admin/delete`                       | Admin: delete attendance record     |
| GET    | `/admin/monthly-stats`                | Admin: monthly stats per employee   |
| POST   | `/admin/recalculate-status`           | Admin: fix Half Day records in bulk |
| GET    | `/admin/employee-monthly-summary`     | Admin: per-employee monthly summary |

### Payroll — `/api/payroll`
| Method | Endpoint                | Description                                |
|--------|-------------------------|--------------------------------------------|
| GET    | `/summary`              | Monthly payout summary (all employees)     |
| POST   | `/initiate`             | Initiate payout for single employee        |
| GET    | `/history`              | Payout history (filterable by month/emp)   |
| POST   | `/generate-slip`        | Mark payouts as "Generated"                |
| POST   | `/publish-slip`         | Publish slips to employees                 |
| DELETE | `/:id`                  | Delete payout record                       |
| GET    | `/my-slips`             | Employee: get own published payslips       |
| GET    | `/download-slip/:id`    | Download PDF payslip (inline or download)  |

### Salary Slip (Manual) — `/api/salary-slip`
| Method | Endpoint    | Description                     |
|--------|-------------|---------------------------------|
| POST   | `/`         | Create/update manual salary slip|
| GET    | `/`         | List all slips (admin)          |
| GET    | `/:id`      | Get single slip                 |
| DELETE | `/:id`      | Delete slip                     |

### Leave Groups — `/api/leave-groups`
| Method | Endpoint               | Description                    |
|--------|------------------------|--------------------------------|
| GET    | `/`                    | List all leave groups          |
| POST   | `/`                    | Create leave group             |
| GET    | `/:id`                 | Get single leave group         |
| PUT    | `/:id`                 | Update leave group             |
| DELETE | `/:id`                 | Delete leave group             |
| POST   | `/:id/toggle-status`   | Toggle Active/Inactive         |
| POST   | `/bulk-delete`         | Delete multiple groups         |

### Requests (Leave/Attendance) — `/api/requests`
| Method | Endpoint          | Description                        |
|--------|-------------------|------------------------------------|
| POST   | `/submit`         | Employee: submit leave/correction  |
| GET    | `/my-requests`    | Employee: own requests             |
| GET    | `/admin/all`      | Admin: all requests with filters   |
| POST   | `/admin/action`   | Admin: approve/reject request      |

### Other Modules
| Prefix                    | Description                                         |
|---------------------------|-----------------------------------------------------|
| `/api/departments`        | CRUD departments                                    |
| `/api/designations`       | CRUD designations                                   |
| `/api/branches`           | CRUD branches with geolocation                      |
| `/api/shifts`             | Manage shifts (schedule, grace, penalties)          |
| `/api/penalty-rules`      | Late/early penalty slabs per shift                  |
| `/api/grace-times`        | Grace time configuration                            |
| `/api/leave-types`        | Leave type management                               |
| `/api/salary-groups`      | Salary group configuration                          |
| `/api/employee-ctc`       | CTC (Cost-to-Company) management                    |
| `/api/payroll-settings`   | Payroll settings (tax, components)                  |
| `/api/earning-deduction-types` | Earning/deduction component catalog           |
| `/api/document-types`     | Document type management                            |
| `/api/onboarding-doc-settings` | Required onboarding documents config          |
| `/api/offboarding`        | Full offboarding workflow                           |
| `/api/retirement`         | Retirement age settings + upcoming retirements      |
| `/api/promotions`         | Employee promotions                                 |
| `/api/resignation`        | Employee resignation lifecycle                      |
| `/api/notifications`      | In-app notifications                                |
| `/api/roles`              | Management role CRUD                                |
| `/api/packages`           | SaaS subscription packages                          |
| `/api/clients`            | Client/company account management                   |
| `/api/company`            | Company profile                                     |
| `/api/admin/reports`      | Attendance reports                                  |
| `/api/dashboard`          | Admin dashboard stats                               |
| `/api/employee-dashboard` | Employee dashboard stats                            |
| `/api/upload`             | Generic file upload                                 |
| `/api/user-management`    | Onboarding pipeline, exit records, grades, roles    |

---

## 🐛 Bugs & Issues Found

### 🔴 Critical Bugs

#### 1. **Duplicate Route Registration — `/api/admin` alias for Client Routes**
**File:** [`server.js` line 191](backend/server.js#L191)
```js
app.use('/api/admin', clientRoutes); // Alias to match requested pattern
```
**Issue:** The `/api/admin` prefix is already used as a route GROUP by `clientRoutes`, which will **shadow or conflict** with Admin-prefixed routes registered elsewhere (e.g., `GET /api/admin/reports`). Since `clientRoutes` is registered as both `/api/clients` AND `/api/admin`, this alias can cause unexpected 404s or wrong handler execution when any route starting with `/api/admin` is accessed.

**Fix:** Remove the alias line or use a more specific path such as `/api/admin/clients`.

---

#### 2. **`PATCH /:id/status` Route Missing Auth Middleware**
**File:** [`User.Routes.js` line 22](backend/routes/User.Routes.js#L22)
```js
router.patch("/:id/status", updateUserStatus); // ← No verifyToken or isAdmin
```
**Issue:** This route allows **anyone** (unauthenticated) to change any user's active/inactive status by sending a PATCH request without a token. This is a significant **authorization bypass** vulnerability.

**Fix:**
```js
router.patch("/:id/status", verifyToken, isAdmin, updateUserStatus);
```

---

#### 3. **`UserManagement.Routes.js` — All Inline Routes Have No Authentication**
**File:** [`UserManagement.Routes.js`](backend/routes/UserManagement.Routes.js)
```js
// Lines 10–133: All GET/POST/PUT/DELETE on /roles, /grades, /resignations
// are completely unprotected — no verifyToken or isAdmin middleware
router.get("/roles", async (req, res) => { ... });   // ← No auth
router.post("/roles", async (req, res) => { ... });  // ← No auth
```
**Issue:** Roles, grades, and resignation records can be read, created, updated, and deleted by unauthenticated users. Business-critical data is fully exposed.

**Fix:** Add `verifyToken, isAdmin` middleware to the router:
```js
const router = express.Router();
router.use(verifyToken, isAdmin); // Add this
```

---

#### 4. **`LeaveGroup.Routes.js` — Missing `isAdmin` Middleware**
**File:** [`LeaveGroup.Routes.js`](backend/routes/LeaveGroup.Routes.js)
```js
router.use(verifyToken); // Only verifyToken — no isAdmin check
```
**Issue:** Any authenticated user (including regular Employees logged in via mobile) can create, update, or delete leave groups. This breaks multi-tenant data isolation.

**Fix:**
```js
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
router.use(verifyToken, isAdmin);
```

---

#### 5. **Payroll Leave Query Bug — `date` field used instead of `fromDate/toDate`**
**File:** [`Payroll.Controller.js` lines 54–58](backend/controllers/Payroll.Controller.js#L54)
```js
const approvedLeaves = await Request.find({
    employee: emp._id,
    requestType: 'Leave',
    status: 'Approved',
    date: { $gte: startDate, $lte: endDate }  // ← WRONG FIELD
});
```
**Issue:** Leave requests use `fromDate` and `toDate` fields, not a single `date` field. This query will **always return 0 results**, causing payroll to compute as if employees took no leaves — leading to incorrect salary calculations.

**Fix:**
```js
const approvedLeaves = await Request.find({
    employee: emp._id,
    requestType: 'Leave',
    status: 'Approved',
    $or: [
        { fromDate: { $gte: startDate, $lte: endDate } },
        { toDate: { $gte: startDate, $lte: endDate } }
    ]
});
```

---

#### 6. **`EditLeaveGroup.jsx` — Form Missing Most Fields**
**File:** [`EditLeaveGroup.jsx`](frontend/src/pages/EditLeaveGroup.jsx#L110)

The `EditLeaveGroup` form only renders 2 fields:
- Leave Group Name
- Leave Balance Visibility

But the backend `LeaveGroup.Model.js` has **20+ configurable fields** including `isPaidLeave`, `leaveAllocationType`, `noOfPaidLeaves`, `maxUseInMonth`, `leaveRestrictions`, `carryForwardIncludes`, `yearEndLeaveBalancePolicy`, etc.

Meanwhile, `AddLeaveGroup.jsx` properly sends all these fields on creation. So the edit form will **silently overwrite everything back to defaults** (since `updateLeaveGroup` uses a raw `req.body` replace and most fields won't be sent).

**Fix:** Port all fields from `AddLeaveGroup.jsx` into `EditLeaveGroup.jsx`.

---

### 🟠 Medium Bugs

#### 7. **`updateLeaveGroup` Missing `runValidators`**
**File:** [`LeaveGroup.Controller.js` line 34–38](backend/controllers/LeaveGroup.Controller.js#L34)
```js
const leaveGroup = await LeaveGroup.findOneAndUpdate(
    { _id: req.params.id, adminId: req.user._id },
    req.body,  // ← Direct req.body without sanitization or runValidators
    { new: true }
);
```
**Issue:** No `runValidators: true` option means schema-level validations (enums, required) are **bypassed** on update. A bad payload can corrupt data.

**Fix:**
```js
{ new: true, runValidators: true }
```

---

#### 8. **`bulkUpdateEmployeeIds` — No Multi-Tenant Isolation**
**File:** [`User.Controller.js` line 559](backend/controllers/User.Controller.js#L559)
```js
const existing = await User.findOne({ 
    employeeId: employeeId.trim(), 
    _id: { $ne: id }   // ← Missing: adminId: req.user._id
});
```
**Issue:** The duplicate check searches **all companies** instead of just the current admin's company. An employee ID unique within the company might be flagged as duplicate because another company uses the same ID.

**Fix:**
```js
const existing = await User.findOne({ 
    employeeId: employeeId.trim(), 
    adminId: req.user._id,
    _id: { $ne: id } 
});
```

---

#### 9. **`Offboarding.Controller.js` — No `adminId` Isolation on Queries**
**File:** [`Offboarding.Controller.js` lines 33–46](backend/controllers/Offboarding.Controller.js#L33)
```js
const offboardings = await Offboarding.find(query)  // ← No adminId filter
```
**Issue:** An admin can see offboarding records from **all other companies** since the query has no `adminId` restriction. Similar issue exists in `getOffboardingDetails` and `updateOffboarding`.

**Fix:** Add `adminId: req.user._id` to all offboarding queries.

---

#### 10. **`Auth.Controller.js` — Razorpay Keys Hard-coded as Fallbacks**
**File:** [`Auth.Controller.js` lines 14–17](backend/controllers/Auth.Controller.js#L14)
```js
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Rya7YN2wKhxeQO',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'eevaOjQnOAz22VKp8Y4HdEyF',
});
```
**Issue:** Test API keys are **hardcoded** as fallbacks. If the env variable is missing in production, real payments will be processed against test keys or the app will fail silently.

**Fix:** Remove the fallback default; throw an error if keys are missing:
```js
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured.");
}
```

---

#### 11. **`PublishSalarySlip.jsx` — Token Exposed in Query String for PDF Preview**
**File:** [`PublishSalarySlip.jsx` line 106](frontend/src/pages/PublishSalarySlip.jsx#L106)
```js
return `${API_URL}/api/payroll/download-slip/${payoutId}?token=${token}...`;
```
**Issue:** JWT token is passed as a URL query parameter for the iframe `src`. This means the token will appear in browser history, server access logs, and referrer headers — a **security exposure**. The same pattern may exist in other PDF-viewing pages.

**Fix:** Use the cookie-based auth (already set by `generateTokenAndSetCookie`) instead. Since the cookie is `httpOnly`, the browser will send it automatically with same-origin requests. Remove the `?token=` approach.

---

#### 12. **`getUpcomingRetirements` Uses Hard-coded Age 60**
**File:** [`UserManagement.Controller.js` line 137](backend/controllers/UserManagement.Controller.js#L137)
```js
const retirementAge = 60; // Hard-coded
```
**Issue:** The `RetirementSetting` model exists and is used elsewhere for configuring retirement ages per company. But this function completely ignores it and uses 60 universally.

**Fix:** Fetch the `RetirementSetting` for the admin's company and use its `retirementAge` value.

---

### 🟡 Minor Issues

#### 13. **`Payroll.Controller.js` — `pdfmake.setFonts()` Misconfiguration**
**File:** [`Payroll.Controller.js` line 344–353](backend/controllers/Payroll.Controller.js#L344)
```js
const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        ...
    }
};
pdfmake.setFonts(fonts);
```
**Issue:** The font family is named `Roboto` but the actual font files are Helvetica built-ins. The `defaultStyle: { font: 'Roboto' }` then references the `Roboto` key which maps to `Helvetica`. While this works, it's confusing naming. More critically, `pdfmake.setFonts` is a global call — not a per-request one. Calling it on every request is redundant overhead.

---

#### 14. **`Request.Controller.js` — Monthly Limit Check Uses `$lte: monthEnd` with "-31"**
**File:** [`Request.Controller.js` line 110–111](backend/controllers/Request.Controller.js#L110)
```js
const monthStart = startStr.substring(0, 7) + "-01";
const monthEnd = startStr.substring(0, 7) + "-31";  // ← Not all months have 31 days
```
**Issue:** February and 30-day months will have `monthEnd` as a date that doesn't exist (e.g. "2026-02-31"), but MongoDB string comparison will still work correctly since "2026-02-31" > "2026-02-28". However, it's fragile. Should use the actual last day of the month for correctness.

---

#### 15. **`Auth.Controller.js` — Password Verified After Status Check (Double Work)**
**File:** [`Auth.Controller.js` line 481](backend/controllers/Auth.Controller.js#L481)
```js
// SaaS Package Check for Admins happens at line ~468
// Then password is checked at line 481 — AFTER package check
const isMatch = await bcrypt.compare(password, user.password);
```
**Issue:** In the multi-user case (line 424–435), bcrypt is already compared to find the matching user. Then at line 481, it's compared **again** for the single-user case. This is a minor logic inefficiency — the double compare doesn't break anything but adds unnecessary work in the single-user path.

---

#### 16. **`Offboarding.Controller.js` — Invalid User Status on Finalization**
**File:** [`Offboarding.Controller.js` line 302–304](backend/controllers/Offboarding.Controller.js#L302)
```js
await User.findByIdAndUpdate(offboarding.employeeId, { 
    status: offboarding.exitType || 'Ex-Employee',  // ← exitType like "Resigned" used as status
    exitDate: offboarding.lastWorkingDate 
});
```
**Issue:** `offboarding.exitType` values (e.g., `"Resignation"`, `"Termination"`) don't match the `User.status` enum values (`"Resigned"`, `"Terminated"`, `"Ex-Employee"`, etc.). This will throw a Mongoose **ValidationError** in production if `runValidators` is used, or silently store invalid data.

**Fix:** Map `exitType` to the correct `User.status` enum value:
```js
const statusMap = {
    'Resignation': 'Resigned',
    'Termination': 'Terminated',
    'Absconding': 'Absconding',
    'Retirement': 'Retired'
};
const newStatus = statusMap[offboarding.exitType] || 'Ex-Employee';
```

---

#### 17. **`App.jsx` — `attendance/punch-missing` and `attendance/punch-request` Both Use Same Component**
**File:** [`App.jsx` lines 188–189](frontend/src/App.jsx#L188)
```jsx
<Route path="attendance/punch-request" element={<PendingAttendance />} />
<Route path="attendance/punch-missing" element={<PendingAttendance />} />
```
**Issue:** Both routes render the same `PendingAttendance` component. If the intent is to show different data (punch requests vs. genuinely missing punches), the component needs to differentiate based on the current route or receive a prop.

---

#### 18. **`isAdmin` Middleware Logs Sensitive Info in Production**
**File:** [`Auth.Middleware.js` line 100](backend/middleware/Auth.Middleware.js#L100)
```js
console.log("IsAdmin Check - Role:", req.user?.role);
```
**Issue:** Logging user role on every admin route request creates excessive log noise and could expose role information in log aggregation systems.

**Fix:** Remove or replace with a debug-level logger.

---

#### 19. **`getLeaveBalances` — Inactive Employees Included**
**File:** [`User.Controller.js` line 677](backend/controllers/User.Controller.js#L677)
```js
const users = await User.find({ 
    status: { $ne: "Ex-Employee" },  // ← Still includes Inactive, Resigned, etc.
    role: { $ne: "Admin" },
    adminId: req.user._id 
})
```
**Issue:** "Inactive" and "Resigned" employees will appear in the leave balance report, inflating the list and potentially causing confusion.

**Fix:** Filter by `status: { $in: ['Active', 'Onboarding'] }`.

---

#### 20. **Frontend: `EditLeaveGroup.jsx` Missing `Content-Type` Header**
**File:** [`EditLeaveGroup.jsx` line 71–74](frontend/src/pages/EditLeaveGroup.jsx#L71)
```js
const res = await authenticatedFetch(`${API_URL}/api/leave-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),  // ← Missing 'Content-Type': 'application/json'
});
```
**Issue:** The `Content-Type: application/json` header is not set. Without it, Express's `express.json()` middleware may not parse the body correctly, resulting in an empty `req.body` on the server side.

**Fix:**
```js
headers: { 'Content-Type': 'application/json' },
```

---

## 📊 Module Overview

| Module              | Backend Controller          | Routes                   | Frontend Page(s)                                  | Status   |
|---------------------|-----------------------------|--------------------------|---------------------------------------------------|----------|
| Auth                | Auth.Controller.js          | Auth.Routes.js           | Login.jsx, Signup.jsx, ResetPassword.jsx          | ✅ Stable |
| Employees           | User.Controller.js          | User.Routes.js           | Employees.jsx, AddEmployee.jsx, EmployeeProfile.jsx | ✅ Stable |
| Attendance          | Attendance.Controller.js    | Attendance.Routes.js     | AdminAttendance.jsx, AddAttendance.jsx, MonthlyAttendance.jsx | ✅ Stable |
| Leave Groups        | LeaveGroup.Controller.js    | LeaveGroup.Routes.js     | LeaveGroup.jsx, AddLeaveGroup.jsx, EditLeaveGroup.jsx | ⚠️ See Bug #4, #6, #20 |
| Leave Requests      | Request.Controller.js       | Request.Routes.js        | AdminRequests.jsx, LeaveBalance.jsx               | ✅ Stable |
| Payroll             | Payroll.Controller.js       | Payroll.Routes.js        | GenerateSalarySlip.jsx, PublishSalarySlip.jsx, PayoutHistory.jsx | ⚠️ See Bug #5, #11 |
| Salary Slip (Manual)| SalarySlip.Controller.js   | SalarySlip.Routes.js     | CreateSalarySlip.jsx                              | ✅ Stable |
| Shifts              | Shift.Controller.js         | Shift.Routes.js          | Shift.jsx, AddShift.jsx, EditShift.jsx            | ✅ Stable |
| Penalty Rules       | PenaltyRule.Controller.js   | PenaltyRule.Routes.js    | PenaltyRules.jsx                                  | ✅ Stable |
| Onboarding          | UserManagement.Controller.js| UserManagement.Routes.js | EmployeeOnboarding.jsx                            | ⚠️ See Bug #3 |
| Offboarding         | Offboarding.Controller.js   | Offboarding.Routes.js    | EmployeeOffboarding.jsx                           | ⚠️ See Bug #9, #16 |
| Retirement          | Retirement.Controller.js    | Retirement.Routes.js     | RetirementSettings.jsx, UpcomingRetirement.jsx    | ⚠️ See Bug #12 |
| Department          | Department.Controller.js    | Department.Routes.js     | Department.jsx                                    | ✅ Stable |
| Designation         | Designation.Controller.js   | Designation.Routes.js    | Designation.jsx                                   | ✅ Stable |
| Branch              | Branch.Controller.js        | Branch.Routes.js         | Branch.jsx                                        | ✅ Stable |
| Employee CTC        | EmployeeCTC.Controller.js   | EmployeeCTC.Routes.js    | EmployeeCTC.jsx, AddEmployeeCTC.jsx               | ✅ Stable |
| Salary Groups       | SalaryGroup.Controller.js   | SalaryGroup.Routes.js    | SalaryGroups.jsx                                  | ✅ Stable |
| Roles & Grades      | (inline in routes)          | UserManagement.Routes.js | ManageRoles.jsx                                   | ⚠️ See Bug #3 |
| Packages            | Package.Controller.js       | Package.Routes.js        | AdminPackages.jsx                                 | ✅ Stable |
| Notifications       | Notification.Controller.js  | Notification.Routes.js   | Header.jsx (bell icon)                            | ✅ Stable |
| Resignation         | Resignation.Controller.js   | Resignation.Routes.js    | AdminResignation.jsx                              | ✅ Stable |
| Document Approval   | User.Controller.js          | User.Routes.js           | DocumentApproval.jsx                              | ✅ Stable |
| Promotions          | Promotion.Controller.js     | Promotion.Routes.js      | EmployeePromotion.jsx                             | ✅ Stable |

---

## 🔒 Security Architecture

### Multi-Tenancy
- All MongoDB documents are scoped by `adminId` (the Admin user's `_id`).
- Compound unique indexes enforce data isolation: `{ email, adminId }`, `{ employeeId, adminId }`, `{ phone, adminId }`.
- Auth middleware checks the `client.isActive` and `client.packageExpiryDate` for **every authenticated request**.

### Rate Limiting
- `express-rate-limit` applied globally on `/api` with 5,000 req/15min (adjustable).

### Anti-Tampering (Attendance)
- GPS mock detection via `isMocked` flag.
- Client-server time drift validation (60-second max for online punches).
- Month-level lock: once a salary slip is published (`status: 'Published'`), no attendance modifications are allowed for that month.

### Salary Slip Security
- Backend recalculates net salary from CTC → rejects if frontend value differs by > ₹2 (manipulation prevention).

---

## 🌐 Frontend Routes Summary

| Route                                   | Component                | Access      |
|-----------------------------------------|--------------------------|-------------|
| `/login`                                | Login                    | Public      |
| `/register`                             | Signup                   | Public      |
| `/reset-password`                       | ResetPassword            | Public      |
| `/admin`                                | AdminDashboard           | Admin       |
| `/admin/company/details`                | CompanyDetails           | Admin       |
| `/admin/company/designation`            | Designation              | Admin       |
| `/admin/attendance/records`             | AdminAttendance          | Admin       |
| `/admin/attendance/monthly`             | MonthlyAttendance        | Admin       |
| `/admin/shift/manage`                   | Shift                    | Admin       |
| `/admin/shift/penalty`                  | PenaltyRules             | Admin       |
| `/admin/leave/group`                    | LeaveGroup               | Admin       |
| `/admin/leave/group/edit/:id`           | EditLeaveGroup           | Admin       |
| `/admin/payroll/employee-ctc`           | EmployeeCTC              | Admin       |
| `/admin/payroll/generate-slip`          | GenerateSalarySlip       | Admin       |
| `/admin/payroll/publish-slip`           | PublishSalarySlip        | Admin       |
| `/admin/employees/list`                 | Employees                | Admin       |
| `/admin/employees/onboarding`           | EmployeeOnboarding       | Admin       |
| `/admin/employees/offboarding`          | EmployeeOffboarding      | Admin       |
| `/admin/packages`                       | AdminPackages            | Admin       |
| `/employee/dashboard`                   | EmployeeDashboard        | Employee    |
| `/employee/attendance`                  | EmployeeAttendance       | Employee    |
| `/mobile/dashboard`                     | MobileDashboard          | Any (auth)  |
| `/mobile/attendance`                    | MobileAttendance         | Any (auth)  |

---

## 📝 Bug Priority Summary

| Priority | Count | Issues                          |
|----------|-------|---------------------------------|
| 🔴 Critical | 6  | #1 Duplicate route, #2 Missing auth on status PATCH, #3 No auth on UserManagement routes, #4 Missing isAdmin on LeaveGroup, #5 Payroll leave query bug, #6 EditLeaveGroup missing fields |
| 🟠 Medium   | 6  | #7 Missing runValidators, #8 Bulk ID no tenant isolation, #9 Offboarding no adminId filter, #10 Hardcoded Razorpay keys, #11 JWT in URL query string, #12 Hardcoded retirement age |
| 🟡 Minor    | 8  | #13–#20 Various logic issues    |

---

## 🔄 Payroll Flow

```
1. Admin opens "Generate Salary Slip" page
2. Selects month → GET /api/payroll/summary
   - Backend calculates: present days, leaves, penalties, accrued salary
3. Admin reviews each employee → POST /api/payroll/initiate
   - Saves Payout document with status="Initiated"
4. Admin selects employees → POST /api/payroll/generate-slip
   - Payout status → "Generated"
5. Admin publishes → POST /api/payroll/publish-slip
   - Payout status → "Published" (month is now LOCKED)
6. Employee views payslip → GET /api/payroll/my-slips
7. Employee downloads PDF → GET /api/payroll/download-slip/:id
```

---

## 🔄 Attendance Flow

```
Employee Opens App
    │
    ├─► GET /api/attendance/today  (check current state)
    │
    ├─► POST /api/attendance/toggle-punch (IN)
    │       - Geofence validation
    │       - Clock tamper check
    │       - Late penalty calculation
    │       - Half-day auto detection
    │
    ├─► POST /api/attendance/toggle-break
    │       - Lunch/Tea window enforcement
    │
    └─► POST /api/attendance/toggle-punch (OUT)
            - Early out penalty
            - Final status calculation (Present/Half Day/Absent)
            - Admin notification via Socket.io
```

---

## 📦 Deployment Notes

- Backend serves static uploads from `public/uploads` (or `UPLOAD_DIR` env).
- Frontend is a Vite SPA — serve `dist/` behind a web server; all routes must redirect to `index.html`.
- Backend must run on a single port (default **7000**).
- Socket.io requires sticky sessions if load-balanced.
- MongoDB Atlas recommended for production; ensure connection string includes `authSource=admin`.

---

## 🗓️ Cron Jobs

Automatically initialized on server start via `initCronJobs()`:
- **Daily Attendance Email**: Sends attendance summary emails to admins.
- **Retirement Reminders**: Checks upcoming retirements and sends alerts.
- **Auto-status Updates**: May transition Resigned employees to Ex-Employee on exit date.

---

*Generated by code analysis — Last updated: June 2026*
