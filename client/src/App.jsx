import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import ParentRoute from './components/ParentRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import Users from './pages/Users';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import ImportStudents from './pages/ImportStudents';
import Archive from './pages/Archive';
import NewAdmission from './pages/NewAdmission';
import Enquiry from './pages/Enquiry';
import FeeStructure from './pages/FeeStructure';
import FeeCollection from './pages/FeeCollection';
import Attendance from './pages/Attendance';
import AttendanceReport from './pages/AttendanceReport';
import Marks from './pages/Marks';
import Results from './pages/Results';
import ReportCard from './pages/ReportCard';
import ClassReportCards from './pages/ClassReportCards';
import Subjects from './pages/Subjects';
import Classes from './pages/Classes';
import Staff from './pages/Staff';
import Payroll from './pages/Payroll';
import PayrollRun from './pages/PayrollRun';
import Payslips from './pages/Payslips';
import Expenses from './pages/Expenses';
import IncomeExpense from './pages/IncomeExpense';
import SmsReminders from './pages/SmsReminders';
import AuditLog from './pages/AuditLog';
import Placeholder from './pages/Placeholder';
import Receipt from './pages/Receipt';
import Statement from './pages/Statement';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Promotion from './pages/Promotion';
import OpeningBalances from './pages/OpeningBalances';
import ParentAccounts from './pages/ParentAccounts';
import Settings from './pages/Settings';
import PortalHome from './pages/PortalHome';
import PortalPayments from './pages/PortalPayments';
import PortalStatement from './pages/PortalStatement';
import PortalReceipt from './pages/PortalReceipt';
import PortalPay from './pages/PortalPay';
import PortalAttendance from './pages/PortalAttendance';
import PortalResults from './pages/PortalResults';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Parent portal: parents only, no staff sidebar */}
            <Route path="/portal" element={<ParentRoute><PortalLayout /></ParentRoute>}>
              <Route index element={<PortalHome />} />
              <Route path="pay/:admNo" element={<PortalPay />} />
              <Route path="payments/:admNo" element={<PortalPayments />} />
              <Route path="statement/:admNo" element={<PortalStatement />} />
              <Route path="receipt/:receipt" element={<PortalReceipt />} />
              <Route path="attendance/:admNo" element={<PortalAttendance />} />
              <Route path="results/:admNo" element={<PortalResults />} />
              <Route path="account" element={<Account />} />
            </Route>

            {/* Staff app */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              {/* every staff role */}
              <Route index element={<Dashboard />} />
              <Route path="account" element={<Account />} />
              <Route path="students" element={<Students />} />
              <Route path="students/:id" element={<StudentProfile />} />

              {/* admin only (superadmin always allowed) */}
              <Route element={<RoleRoute roles={['admin']} />}>
                <Route path="students/new" element={<NewAdmission />} />
                <Route path="students/import" element={<ImportStudents />} />
                <Route path="students/archive" element={<Archive />} />
                <Route path="students/enquiry" element={<Enquiry />} />
                <Route path="students/promotion" element={<Promotion />} />
                <Route path="academics/subjects" element={<Subjects />} />
                <Route path="academics/classes" element={<Classes />} />
                <Route path="staff" element={<Staff />} />
                <Route path="payroll" element={<Payroll />} />
                <Route path="payroll/:id" element={<PayrollRun />} />
                <Route path="payroll/:id/payslips" element={<Payslips />} />
                <Route path="users" element={<Users />} />
                <Route path="parents" element={<ParentAccounts />} />
                <Route path="settings" element={<Settings />} />
                <Route path="audit" element={<AuditLog />} />
              </Route>

              {/* fees and finance: admin + accountant */}
              <Route element={<RoleRoute roles={['admin', 'accountant']} />}>
                <Route path="fees/structure" element={<FeeStructure />} />
                <Route path="fees/collection" element={<FeeCollection />} />
                <Route path="fees/payments" element={<Payments />} />
                <Route path="fees/receipt/:receipt" element={<Receipt />} />
                <Route path="fees/statement/:admNo" element={<Statement />} />
                <Route path="fees/reports" element={<Reports />} />
                <Route path="fees/opening-balances" element={<OpeningBalances />} />
                <Route path="fees/sms" element={<SmsReminders />} />
                <Route path="finance/expenses" element={<Expenses />} />
                <Route path="finance/income-expense" element={<IncomeExpense />} />
              </Route>

              {/* academics: admin + teacher */}
              <Route element={<RoleRoute roles={['admin', 'teacher']} />}>
                <Route path="academics/attendance" element={<Attendance />} />
                <Route path="academics/attendance-report" element={<AttendanceReport />} />
                <Route path="academics/marks" element={<Marks />} />
                <Route path="academics/results" element={<Results />} />
                <Route path="academics/report-card/:admNo" element={<ReportCard />} />
                <Route path="academics/report-cards" element={<ClassReportCards />} />
              </Route>

              {/* keep this last */}
              <Route path="*" element={<Placeholder />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}