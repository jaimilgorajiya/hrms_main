import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./layout/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import CompanyDetails from "./pages/CompanyDetails";
import MyProfile from "./pages/MyProfile";
import Designation from "./pages/Designation";
import Branch from './pages/Branch';
import Department from './pages/Department';
import BreakType from './pages/BreakType';
import Shift from './pages/Shift';
import AddShift from './pages/AddShift';
import EditShift from './pages/EditShift';
import PenaltyRules from './pages/PenaltyRules';
import GraceTime from './pages/GraceTime';
import LeaveType from './pages/LeaveType';
import LeaveGroup from './pages/LeaveGroup';
import AddLeaveGroup from './pages/AddLeaveGroup';
import EditLeaveGroup from './pages/EditLeaveGroup';
import EarningDeductionType from './pages/EarningDeductionType';
import SalaryGroups from './pages/SalaryGroups';
import EmployeeCTC from './pages/EmployeeCTC';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import EmployeeOffboarding from './pages/EmployeeOffboarding';
import PayrollTaxSetting from './pages/PayrollTaxSetting';
import DocumentType from './pages/DocumentType';
import OnboardingDocSetting from './pages/OnboardingDocSetting';
import Employees from './pages/Employees';
import AddEmployee from './pages/AddEmployee';
import EmployeeProfile from './pages/EmployeeProfile';
import ExEmployees from './pages/ExEmployees';
import ManageRoles from './pages/ManageRoles';
import ChangeBranch from './pages/ChangeBranch';
import BulkEmployeeId from './pages/BulkEmployeeId';
import EmployeeIdFormat from './pages/EmployeeIdFormat';
import RetirementSettings from './pages/RetirementSettings';
import UpcomingRetirement from './pages/UpcomingRetirement';
import EmployeePromotion from './pages/EmployeePromotion';
import DailyAttendanceEmail from './pages/DailyAttendanceEmail';
import AdminAttendance from './pages/AdminAttendance';
import AddAttendance from './pages/AddAttendance';
import AbsentEmployees from './pages/AbsentEmployees';
import AdminRequests from './pages/AdminRequests';
import AdminDeleteAttendance from './pages/AdminDeleteAttendance';
import AssignBulkLeave from './pages/AssignBulkLeave';
import AddLeaveAssign from './pages/AddLeaveAssign';
import LeaveBalance from './pages/LeaveBalance';
import LeaveHistory from './pages/LeaveHistory';
import UseMobileApp from './pages/employee/UseMobileApp';
import MonthlyAttendance from './pages/MonthlyAttendance';
import PendingAttendance from "./pages/PendingAttendance";
import MonthlyPayout from './pages/MonthlyPayout';
import PayoutHistory from './pages/PayoutHistory';
import GenerateSalarySlip from './pages/GenerateSalarySlip';
import PublishSalarySlip from './pages/PublishSalarySlip';
import AdminResignation from './pages/AdminResignation';
import AttendanceReport from './pages/AttendanceReport';
import EmployeeLayout from './layout/EmployeeLayout';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeMyProfile from './pages/employee/EmployeeMyProfile';
import EmployeeAttendance from './pages/employee/EmployeeAttendance';
import EmployeeLeaves from './pages/employee/EmployeeLeaves';
import EmployeePayslips from './pages/employee/EmployeePayslips';
import EmployeeDocuments from './pages/employee/EmployeeDocuments';
import EmployeeShift from './pages/employee/EmployeeShift';
import EmployeeResignation from './pages/employee/EmployeeResignation';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login isRegister={false} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Login isRegister={true} />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="profile" element={<MyProfile />} />
              <Route path="company/details" element={<CompanyDetails />} />
              <Route path="company/designation" element={<Designation />} />
              <Route path="company/departments" element={<Department />} />
              <Route path="company/branches" element={<Branch />} />
              <Route path="company/profile" element={<MyProfile />} />
              <Route path="company/emp-id-format" element={<EmployeeIdFormat />} />
              <Route path="company/retirement-settings" element={<RetirementSettings />} />
              <Route path="company/attendance-email" element={<DailyAttendanceEmail />} />
              <Route path="company-settings" element={<ModulePlaceholder title="Company Settings" />} />
              <Route path="company/*" element={<ModulePlaceholder title="Company Management" />} />
              <Route path="attendance/break-type" element={<BreakType />} />
              <Route path="attendance/records" element={<AdminAttendance />} />
              <Route path="attendance/add" element={<AddAttendance />} />
              <Route path="attendance/monthly" element={<MonthlyAttendance />} />
              <Route path="attendance/absent" element={<AbsentEmployees />} />
              <Route path="attendance/delete" element={<AdminDeleteAttendance />} />
              <Route path="attendance/report" element={<AttendanceReport />} />
              <Route path="attendance-settings" element={<ModulePlaceholder title="Attendance Settings" />} />
              <Route path="attendance/*" element={<ModulePlaceholder title="Attendance Management" />} />
              <Route path="shift/add" element={<AddShift />} />
              <Route path="shift/edit/:id" element={<EditShift />} />
              <Route path="shift/manage" element={<Shift />} />
              <Route path="shift/penalty" element={<PenaltyRules />} />
              <Route path="shift/grace-time" element={<GraceTime />} />
              <Route path="shift-settings" element={<ModulePlaceholder title="Shift Settings" />} />
              <Route path="leave/type" element={<LeaveType />} />
              <Route path="leave/group" element={<LeaveGroup />} />
              <Route path="leave/group/add" element={<AddLeaveGroup />} />
              <Route path="leave/group/edit/:id" element={<EditLeaveGroup />} />
              <Route path="leave/bulk-assign" element={<AssignBulkLeave />} />
              <Route path="leave/assign/add" element={<AddLeaveAssign />} />
              <Route path="leave/balance" element={<LeaveBalance />} />
              <Route path="leave/request" element={<AdminRequests />} />
              <Route path="leave/history" element={<LeaveHistory />} />
              <Route path="leave/auto" element={<ModulePlaceholder title="Auto Leaves" />} />
              <Route path="leave/payout" element={<ModulePlaceholder title="Leave Pay Out" />} />
              <Route path="leave/*" element={<ModulePlaceholder title="Leave Management" />} />
              <Route path="payroll-settings" element={<ModulePlaceholder title="Payroll Settings" />} />
              <Route path="payroll/tax-setting" element={<PayrollTaxSetting />} />
              <Route path="payroll/salary-group" element={<SalaryGroups />} />
              <Route path="payroll/employee-ctc" element={<EmployeeCTC />} />
              <Route path="payroll/earning-deduction" element={<EarningDeductionType />} />
              <Route path="payroll/generate-slip" element={<GenerateSalarySlip />} />
              <Route path="payroll/publish-slip" element={<PublishSalarySlip />} />
              <Route path="payroll/history" element={<PayoutHistory />} />
              <Route path="payroll/*" element={<ModulePlaceholder title="Payroll Management" />} />
              <Route path="document/emp-types" element={<DocumentType />} />
              <Route path="document/onboarding-setting" element={<OnboardingDocSetting />} />
              <Route path="document/*" element={<ModulePlaceholder title="Document Management" />} />
              <Route path="employees/list" element={<Employees />} />
              <Route path="employees/add" element={<AddEmployee />} />
              <Route path="employees/profile/:id" element={<EmployeeProfile />} />
              <Route path="employees/ex" element={<ExEmployees />} />
              <Route path="employees/onboarding" element={<EmployeeOnboarding />} />
              <Route path="employees/offboarding" element={<EmployeeOffboarding />} />
              <Route path="employees/mgmt-role" element={<ManageRoles />} />
              <Route path="employees/profile-request" element={<ModulePlaceholder title="Profile Request" />} />
              <Route path="employees/change-branch" element={<ChangeBranch />} />
              <Route path="employees/bulk-id" element={<BulkEmployeeId />} />
              <Route path="employees/hierarchy" element={<ModulePlaceholder title="Hierarchy Chart" />} />
              <Route path="employees/resignation" element={<AdminResignation />} />
              <Route path="employees/other" element={<ModulePlaceholder title="Other Employees" />} />
              <Route path="employees/retirement" element={<UpcomingRetirement />} />
              <Route path="employees/bulk-upload" element={<ModulePlaceholder title="Bulk Upload" />} />
              <Route path="employees/promotion" element={<EmployeePromotion />} />
              <Route path="employees/*" element={<ModulePlaceholder title="Employee Management" />} />
              <Route path="shifts/*" element={<ModulePlaceholder title="Shift Operations" />} />
              <Route path="attendance/punch-request" element={<PendingAttendance />} />
              <Route path="attendance/punch-missing" element={<PendingAttendance />} />
              <Route path="attendance/request" element={<AdminRequests />} />
              <Route path="monthly-payout" element={<MonthlyPayout />} />
              <Route path="payout-history" element={<PayoutHistory />} />
              <Route path="leaves/*" element={<ModulePlaceholder title="Leave Operations" />} />
              <Route path="wfh/*" element={<ModulePlaceholder title="WFH Management" />} />
              <Route path="holidays/*" element={<ModulePlaceholder title="Holiday Management" />} />
              <Route path="documents/*" element={<ModulePlaceholder title="Company Documents" />} />
              <Route path="engagement/*" element={<ModulePlaceholder title="Employee Engagement" />} />
            </Route>
            <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Manager']} />}>
            <Route path="/manager-dashboard" element={<Dashboard title="Manager Dashboard" />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['Employee']} />}>
            <Route path="/employee" element={<EmployeeLayout />}>
              <Route index element={<EmployeeDashboard />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="profile" element={<EmployeeMyProfile />} />
              <Route path="attendance" element={<EmployeeAttendance />} />
              <Route path="leaves" element={<EmployeeLeaves />} />
              <Route path="payslips" element={<EmployeePayslips />} />
              <Route path="documents" element={<EmployeeDocuments />} />
              <Route path="shift" element={<EmployeeShift />} />
              <Route path="resignation" element={<EmployeeResignation />} />
            </Route>
            <Route path="/employee-dashboard" element={<Navigate to="/employee/dashboard" replace />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
