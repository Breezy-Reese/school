import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 h-screen overflow-y-auto bg-slate-100">
        <header className="flex justify-between items-center px-6 py-3 bg-white shadow-sm">
          <span className="text-sm text-slate-500">Welcome, {user.name}</span>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/account" className="text-slate-600 hover:underline">My account</Link>
            <button onClick={logout} className="text-red-600 hover:underline">Logout</button>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}