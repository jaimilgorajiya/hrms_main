// Single source of truth for sidebar + permission matrix

export const menuItems = [
  {
    title: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    path: "/admin-dashboard",
  },
  {
    title: "Setup & Configuration",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    subItems: [
      {
        title: "Company Setting",
        path: "/admin/company-settings",
        children: [
          { title: "Company details", path: "/admin/company/details" },
          { title: "Designation", path: "/admin/company/designation" },
          { title: "Branches", path: "/admin/company/branches" },
          { title: "Departments", path: "/admin/company/departments" },
          { title: "Daily Attendance Email", path: "/admin/company/attendance-email" },
          { title: "Employee ID Format", path: "/admin/company/emp-id-format" },
          { title: "Retirement Settings", path: "/admin/company/retirement-settings" },
        ],
      },
      {
        title: "Attendance Setting",
        path: "/admin/attendance-settings",
        children: [
          { title: "Break Type", path: "/admin/attendance/break-type" },
          { title: "Attendance/Breaks Setting", path: "/admin/attendance/breaks-setting" },
          { title: "EMP Attendance Setting", path: "/admin/attendance/emp-setting" },
        ],
      },
      {
        title: "Shift Setting",
        path: "/admin/shift-settings",
        children: [
          { title: "Add Shift", path: "/admin/shift/add" },
          { title: "Manage Shift", path: "/admin/shift/manage" },
          { title: "Penalty Rules", path: "/admin/shift/penalty" },
          { title: "Add Next Day Grace Time", path: "/admin/shift/grace-time" },
        ],
      },
      {
        title: "Leave Setting",
        path: "/admin/leave-settings",
        children: [
          { title: "Leave Type", path: "/admin/leave/type" },
          { title: "Leave Group", path: "/admin/leave/group" },
        ],
      },
      {
        title: "Payroll Setting",
        path: "/admin/payroll-settings",
        children: [
          { title: "Payroll & Tax Setting", path: "/admin/payroll/tax-setting" },
          { title: "Earning & Deduction Type", path: "/admin/payroll/earning-deduction" },
          { title: "Salary Group", path: "/admin/payroll/salary-group" },
        ],
      },
      {
        title: "Document Setting",
        path: "/admin/document-settings",
        children: [
          { title: "Employee Documents Types", path: "/admin/document/emp-types" },
          { title: "Onboarding Doc. Setting", path: "/admin/document/onboarding-setting" },
        ],
      },
    ],
  },
  {
    title: "Core HRMS",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    subItems: [
      {
        title: "Employee & Management",
        path: "/admin/employees",
        children: [
          { title: "Employees", path: "/admin/employees/list" },
          { title: "Ex Employee", path: "/admin/employees/ex" },
          { title: "Employee Onboarding", path: "/admin/employees/onboarding" },
          { title: "Employee Offboarding", path: "/admin/employees/offboarding" },
          { title: "Sidebar Setup", path: "/admin/employees/mgmt-role" },
          { title: "Profile Change Request", path: "/admin/employees/profile-request" },
          { title: "Change Branch", path: "/admin/employees/change-branch" },
          { title: "Update Bulk Employee ID", path: "/admin/employees/bulk-id" },
          // { title: "Employees Level Hierarchy Chart", path: "/admin/employees/hierarchy" },
          { title: "Employee Resignation", path: "/admin/employees/resignation" },
          // { title: "Other Employee", path: "/admin/employees/other" },
          { title: "Upcoming Retirement", path: "/admin/employees/retirement" },
          // { title: "Bulk Upload", path: "/admin/employees/bulk-upload" },
          { title: "Employee Promotion", path: "/admin/employees/promotion" },
        ],
      },
      {
        title: "Shift Management",
        path: "/admin/shifts",
        children: [
          { title: "Shift Rotation", path: "/admin/shifts/rotation" },
          { title: "Emp Shift", path: "/admin/shifts/emp" },
          { title: "Shift change request", path: "/admin/shifts/request" },
        ],
      },
      {
        title: "Attendance",
        path: "/admin/attendance",
        children: [
          { title: "Attendance Records", path: "/admin/attendance/records" },
          { title: "Add Attendance", path: "/admin/attendance/add" },
          { title: "Monthly Attendances", path: "/admin/attendance/monthly" },
          { title: "Punch Out Request", path: "/admin/attendance/punch-request" },
          { title: "Attendance Request", path: "/admin/attendance/request" },
          { title: "Absent Emp", path: "/admin/attendance/absent" },
          { title: "Delete Attendance", path: "/admin/attendance/delete" },
          { title: "Attendance Report", path: "/admin/attendance/report" },
        ],
      },  
      {
        title: "Payroll",
        path: "/admin/payroll",
        children: [
          { title: "Employee CTC", path: "/admin/payroll/employee-ctc" },
          { title: "Monthly Payout Summary", path: "/admin/monthly-payout" },
          { title: "Generate Salary Slip", path: "/admin/payroll/generate-slip" },
          { title: "Publish Salary Slip", path: "/admin/payroll/publish-slip" },
          { title: "Payroll History", path: "/admin/payroll/history" },
        ],
      },
    ],
  },
 
  {
    title: "Leave Management",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    subItems: [
      { title: "Assign Bulk Leave", path: "/admin/leave/bulk-assign" },
      { title: "Leave Balance", path: "/admin/leave/balance" },
      { title: "Leave Request", path: "/admin/leave/request" },
      { title: "Leave Request History", path: "/admin/leave/history" },
      { title: "Auto Leaves", path: "/admin/leave/auto" },
      { title: "Leave Pay Out", path: "/admin/leave/payout" },
    ],
  },
];

export function flattenToPermissionRows(items = menuItems) {
  const rows = [];
  for (const mod of items) {
    if (!mod.subItems) {
      rows.push({ module: mod.title, subModule: null, childModule: null, access: true });
      continue;
    }
    for (const sub of mod.subItems) {
      if (!sub.children) {
        rows.push({ module: mod.title, subModule: sub.title, childModule: null, access: true });
        continue;
      }
      for (const child of sub.children) {
        rows.push({ module: mod.title, subModule: sub.title, childModule: child.title, access: true });
      }
    }
  }
  return rows;
}

