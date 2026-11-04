import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/new" element={<NewAdmission />} />
            <Route path="students/enquiry" element={<Enquiry />} />
            <Route path="fees/structure" element={<FeeStructure />} />
            <Route path="fees/collection" element={<FeeCollection />} />
            <Route path="academics/attendance" element={<Attendance />} />
            <Route path="academics/marks" element={<Marks />} />
            <Route path="academics/subjects" element={<Subjects />} />
            <Route path="staff" element={<Staff />} />
            {/* keep this last */}
            <Route path="*" element={<Placeholder />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}