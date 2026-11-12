import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Users, ClipboardList, Wallet,
  CalendarCheck, FileText, BookOpen, Receipt, Briefcase, ShieldCheck,
  History, BarChart3, GraduationCap, Landmark, UserCheck, Settings,Upload,

} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN = ['admin'];
const FEES = ['admin', 'accountant'];
const ACADEMIC = ['admin', 'teacher'];
const ALL = ['admin', 'teacher', 'accountant'];

const menu = [
  { section: 'Main', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  ]},
  { section: 'Students', items: [
    { to: '/students/enquiry', label: 'Admission Enquiry', icon: ClipboardList, roles: ADMIN },
    { to: '/students/new', label: 'New Admission', icon: UserPlus, roles: ADMIN },
    { to: '/students', label: 'All Students', icon: Users, roles: ALL },
    { to: '/students/promotion', label: 'Promotion', icon: GraduationCap, roles: ADMIN },
    { to: '/students/import', label: 'Import Students', icon: Upload, roles: ADMIN },
  ]},
  { section: 'Fees', items: [
    { to: '/fees/structure', label: 'Fee Structure', icon: Receipt, roles: FEES },
    { to: '/fees/collection', label: 'Fee Collection', icon: Wallet, roles: FEES },
    { to: '/fees/payments', label: 'Payment History', icon: History, roles: FEES },
    { to: '/fees/opening-balances', label: 'Opening Balances', icon: Landmark, roles: FEES },
    { to: '/fees/reports', label: 'Reports', icon: BarChart3, roles: FEES },
  ]},
  { section: 'Academics', items: [
    { to: '/academics/attendance', label: 'Attendance', icon: CalendarCheck, roles: ACADEMIC },
    { to: '/academics/marks', label: 'Marks Entry', icon: FileText, roles: ACADEMIC },
    { to: '/academics/subjects', label: 'Subjects', icon: BookOpen, roles: ADMIN },
  ]},
  { section: 'Staff / Payroll', items: [
    { to: '/staff', label: 'Staff Management', icon: Briefcase, roles: ADMIN },
  ]},
  { section: 'Administration', items: [
    { to: '/users', label: 'Users & Roles', icon: ShieldCheck, roles: ADMIN },
    { to: '/parents', label: 'Parent Accounts', icon: UserCheck, roles: ADMIN },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ADMIN },
  ]},
];

export default function Sidebar() {
  const { user, can } = useAuth();

  const groups = menu
    .map((g) => ({ ...g, items: g.items.filter((i) => can(i.roles)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 h-screen overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h1 className="font-bold text-white">School Management</h1>
        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
      </div>
      {groups.map((group) => (
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