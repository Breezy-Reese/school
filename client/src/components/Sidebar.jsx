import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Users, ClipboardList, Wallet,
  CalendarCheck, FileText, BookOpen, Receipt, Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menu = [
  { section: 'Main', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Students', items: [
    { to: '/students/enquiry', label: 'Admission Enquiry', icon: ClipboardList },
    { to: '/students/new', label: 'New Admission', icon: UserPlus },
    { to: '/students', label: 'All Students', icon: Users },
  ]},
  { section: 'Fees', roles: ['superadmin', 'admin', 'accountant'], items: [
    { to: '/fees/structure', label: 'Fee Structure', icon: Receipt },
    { to: '/fees/collection', label: 'Fee Collection', icon: Wallet },
  ]},
  { section: 'Academics', items: [
    { to: '/academics/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/academics/marks', label: 'Marks Entry', icon: FileText },
    { to: '/academics/subjects', label: 'Subjects', icon: BookOpen },
  ]},
  { section: 'Staff / Payroll', roles: ['superadmin', 'admin'], items: [
    { to: '/staff', label: 'Staff Management', icon: Briefcase },
  ]},
];

export default function Sidebar() {
  const { user } = useAuth();
  const visible = menu.filter((g) => !g.roles || g.roles.includes(user.role));

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 h-screen overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h1 className="font-bold text-white">School Management</h1>
        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
      </div>
      {visible.map((group) => (
        <div key={group.section} className="px-3 pt-4">
          <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {group.section}
          </p>
          {group.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-2 rounded text-sm ${
                  isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}