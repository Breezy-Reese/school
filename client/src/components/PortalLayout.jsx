import { Link, Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SCHOOL } from '../config';

export default function PortalLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2 font-semibold">
            <GraduationCap size={20} /> {SCHOOL.name}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-slate-300">{user.name}</span>
            <Link to="/portal/account" className="hover:underline">My account</Link>
            <button onClick={logout} className="text-red-300 hover:underline">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
}