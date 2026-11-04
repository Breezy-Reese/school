import { Outlet } from 'react-router-dom';
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
          <button onClick={logout} className="text-sm text-red-600 hover:underline">
            Logout
          </button>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}