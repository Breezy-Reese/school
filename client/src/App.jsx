import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import NewAdmission from './pages/NewAdmission';
import Enquiry from './pages/Enquiry';
import FeeStructure from './pages/FeeStructure';
import FeeCollection from './pages/FeeCollection';
import Attendance from './pages/Attendance';
import Marks from './pages/Marks';
import Subjects from './pages/Subjects';
import Staff from './pages/Staff';
import Placeholder from './pages/Placeholder';
import Receipt from './pages/Receipt';
import Statement from './pages/Statement';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Promotion from './pages/Promotion';
import OpeningBalances from './pages/OpeningBalances';
import ParentAccounts from './pages/ParentAccounts';
import PortalHome from './pages/PortalHome';
import PortalPayments from './pages/PortalPayments';
import PortalStatement from './pages/PortalStatement';
import PortalReceipt from './pages/PortalReceipt';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Parent portal: parents only, no staff sidebar */}
          <Route path="/portal" element={<ParentRoute><PortalLayout /></ParentRoute>}>
            <Route index element={<PortalHome />} />
            <Route path="payments/:admNo" element={<PortalPayments />} />
            <Route path="statement/:admNo" element={<PortalStatement />} />
            <Route path="receipt/:receipt" element={<PortalReceipt />} />
            <Route path="account" element={<Account />} />
          </Route>

          {/* Staff app */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* every staff role */}
            <Route index element={<Dashboard />} />
            <Route path="account" element={<Account />} />
            <Route path="students" element={<Students />} />

            {/* admin only (superadmin always allowed) */}
            <Route element={<RoleRoute roles={['admin']} />}>
              <Route path="students/new" element={<NewAdmission />} />
              <Route path="students/enquiry" element={<Enquiry />} />
              <Route path="students/promotion" element={<Promotion />} />
              <Route path="academics/subjects" element={<Subjects />} />
              <Route path="staff" element={<Staff />} />
              <Route path="users" element={<Users />} />
              <Route path="parents" element={<ParentAccounts />} />
            </Route>

            {/* fees: admin + accountant */}
            <Route element={<RoleRoute roles={['admin', 'accountant']} />}>
              <Route path="fees/structure" element={<FeeStructure />} />
              <Route path="fees/collection" element={<FeeCollection />} />
              <Route path="fees/payments" element={<Payments />} />
              <Route path="fees/receipt/:receipt" element={<Receipt />} />
              <Route path="fees/statement/:admNo" element={<Statement />} />
              <Route path="fees/reports" element={<Reports />} />
              <Route path="fees/opening-balances" element={<OpeningBalances />} />
            </Route>

            {/* academics: admin + teacher */}
            <Route element={<RoleRoute roles={['admin', 'teacher']} />}>
              <Route path="academics/attendance" element={<Attendance />} />
              <Route path="academics/marks" element={<Marks />} />
            </Route>

            {/* keep this last */}
            <Route path="*" element={<Placeholder />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}