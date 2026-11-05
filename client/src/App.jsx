import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* every logged-in role */}
            <Route index element={<Dashboard />} />
            <Route path="account" element={<Account />} />
            <Route path="students" element={<Students />} />

            {/* admin only (superadmin always allowed) */}
            <Route element={<RoleRoute roles={['admin']} />}>
              <Route path="students/new" element={<NewAdmission />} />
              <Route path="students/enquiry" element={<Enquiry />} />
              <Route path="academics/subjects" element={<Subjects />} />
              <Route path="staff" element={<Staff />} />
              <Route path="users" element={<Users />} />
              <Route path="fees/receipt/:receipt" element={<Receipt />} />
  <Route path="fees/statement/:admNo" element={<Statement />} />
            </Route>

            {/* fees */}
            <Route element={<RoleRoute roles={['admin', 'accountant']} />}>
              <Route path="fees/structure" element={<FeeStructure />} />
              <Route path="fees/collection" element={<FeeCollection />} />
            </Route>

            {/* academics */}
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