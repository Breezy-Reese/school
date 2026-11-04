import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Wallet, CalendarCheck, TrendingUp,
  ClipboardList, Receipt, FileText,
} from 'lucide-react';

// Sample data: replace with API calls once the modules are built
const stats = [
  { label: 'Total Students', value: '1,248', note: '+32 this term', icon: Users, color: 'bg-blue-100 text-blue-700' },
  { label: 'New Admissions', value: '86', note: 'This session', icon: UserPlus, color: 'bg-green-100 text-green-700' },
  { label: 'Fees Collected', value: 'KES 4.2M', note: '68% of target', icon: Wallet, color: 'bg-amber-100 text-amber-700' },
  { label: "Today's Attendance", value: '94%', note: '1,172 present', icon: CalendarCheck, color: 'bg-purple-100 text-purple-700' },
];

const quickActions = [
  { label: 'New Admission', to: '/students/new', icon: UserPlus },
  { label: 'Collect Fee', to: '/fees/collection', icon: Wallet },
  { label: 'Mark Attendance', to: '/academics/attendance', icon: CalendarCheck },
  { label: 'Enter Marks', to: '/academics/marks', icon: FileText },
];

const monthlyFees = [
  { month: 'Jan', amount: 820 },
  { month: 'Feb', amount: 640 },
  { month: 'Mar', amount: 710 },
  { month: 'Apr', amount: 390 },
  { month: 'May', amount: 560 },
  { month: 'Jun', amount: 480 },
];

const recent = [
  { text: 'New admission: ADM-26-1061', time: '10 min ago', icon: UserPlus },
  { text: 'Fee payment received: KES 15,000', time: '1 hr ago', icon: Receipt },
  { text: 'Enquiry received for Form 1', time: '3 hrs ago', icon: ClipboardList },
  { text: 'Form 3 results published', time: 'Yesterday', icon: TrendingUp },
];

export default function Dashboard() {
  const max = Math.max(...monthlyFees.map((m) => m.amount));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-slate-500">Overview of the current session</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, note, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-[11px] text-slate-400">{note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-3 text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <Icon size={18} className="text-blue-600" /> {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fee chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold mb-1">Fee Collection</h3>
          <p className="text-xs text-slate-500 mb-4">Amount in KES thousands</p>
          <div className="flex items-end gap-4 h-48">
            {monthlyFees.map(({ month, amount }) => (
              <div key={month} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[11px] text-slate-500 mb-1">{amount}</span>
                <div
                  className="w-full bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors"
                  style={{ height: `${(amount / max) * 100}%` }}
                />
                <span className="text-xs mt-2 text-slate-600">{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <ul className="space-y-3">
            {recent.map(({ text, time, icon: Icon }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-slate-100 text-slate-600">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-sm">{text}</p>
                  <p className="text-[11px] text-slate-400">{time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}