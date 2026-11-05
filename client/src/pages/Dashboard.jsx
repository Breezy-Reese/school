import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Wallet, CalendarCheck, TrendingDown,
  ClipboardList, Receipt, FileText,
} from 'lucide-react';
import { ErrorMsg } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

function Stat({ label, value, note, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon size={22} /></div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {note && <p className="text-[11px] text-slate-400">{note}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setD(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Could not load the dashboard'));
  }, []);

  const actions = [
    { label: 'New Admission', to: '/students/new', icon: UserPlus, roles: ['admin'] },
    { label: 'Collect Fee', to: '/fees/collection', icon: Wallet, roles: ['admin', 'accountant'] },
    { label: 'Mark Attendance', to: '/academics/attendance', icon: CalendarCheck, roles: ['admin', 'teacher'] },
    { label: 'Enter Marks', to: '/academics/marks', icon: FileText, roles: ['admin', 'teacher'] },
  ].filter((a) => can(a.roles));

  const maxMonth = d?.fees ? Math.max(1, ...d.fees.monthly.map((m) => m.amount)) : 1;
  const maxClass = d ? Math.max(1, ...d.students.byClass.map((c) => c.count)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm text-slate-500">Welcome back, {user.name}</p>
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {d && (
        <>
          {/* Stat cards: each one only appears if the server sent that data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Active Students" value={d.students.active.toLocaleString()} note={`${d.students.newAdmissions} admitted this year`} icon={Users} color="bg-blue-100 text-blue-700" />

            {d.attendance && (
              <Stat
                label="Today's Attendance"
                value={d.attendance.rate === null ? 'Not marked' : `${d.attendance.rate}%`}
                note={d.attendance.rate === null ? 'No class marked yet' : `${d.attendance.attended} of ${d.attendance.marked} • ${d.attendance.classesMarked} class(es)`}
                icon={CalendarCheck} color="bg-purple-100 text-purple-700"
              />
            )}

            {d.fees && (
              <>
                <Stat label={`${d.fees.term} Collected`} value={kes(d.fees.collected)} note={d.fees.rate === null ? '' : `${d.fees.rate}% of ${kes(d.fees.expected)}`} icon={Wallet} color="bg-green-100 text-green-700" />
                <Stat label="Outstanding Fees" value={kes(d.fees.outstanding)} note={`${kes(d.fees.thisMonth)} collected this month`} icon={TrendingDown} color="bg-amber-100 text-amber-700" />
              </>
            )}

            {d.admin && (
              <Stat label="Open Enquiries" value={d.admin.openEnquiries} note={`${d.admin.staff} staff on record`} icon={ClipboardList} color="bg-sky-100 text-sky-700" />
            )}
          </div>

          {/* Quick actions */}
          {actions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {actions.map(({ label, to, icon: Icon }) => (
                  <Link key={to} to={to} className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-3 text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors">
                    <Icon size={18} className="text-blue-600" /> {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Fee chart (fees roles) or class breakdown (everyone else) */}
            {d.fees ? (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="font-semibold mb-1">Fee Collection</h3>
                <p className="text-xs text-slate-500 mb-4">Last 6 months (KES)</p>
                <div className="flex items-end gap-4 h-48">
                  {d.fees.monthly.map(({ label, amount }) => (
                    <div key={label} className="flex-1 flex flex-col items-center justify-end h-full">
                      <span className="text-[11px] text-slate-500 mb-1">{amount ? amount.toLocaleString() : '0'}</span>
                      <div className="w-full bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors" style={{ height: `${Math.max((amount / maxMonth) * 100, 2)}%` }} />
                      <span className="text-xs mt-2 text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="font-semibold mb-4">Students by Class</h3>
                <ul className="space-y-3">
                  {d.students.byClass.length === 0 && <li className="text-sm text-slate-400">No students yet.</li>}
                  {d.students.byClass.map((c) => (
                    <li key={c.class}>
                      <div className="flex justify-between text-sm mb-1"><span>{c.class}</span><span className="text-slate-500">{c.count}</span></div>
                      <div className="h-2 bg-slate-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(c.count / maxClass) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold mb-3">Recent Admissions</h3>
              <ul className="space-y-3">
                {d.students.recent.length === 0 && <li className="text-sm text-slate-400">Nothing yet.</li>}
                {d.students.recent.map((s) => (
                  <li key={s._id} className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-slate-100 text-slate-600"><UserPlus size={14} /></div>
                    <div>
                      <p className="text-sm">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.admNo} • {s.class}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {d.fees && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold mb-3">Recent Payments</h3>
              <ul className="divide-y divide-slate-100">
                {d.fees.recentPayments.length === 0 && <li className="text-sm text-slate-400 py-2">No payments recorded yet.</li>}
                {d.fees.recentPayments.map((p) => (
                  <li key={p._id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-green-50 text-green-700"><Receipt size={14} /></div>
                      <div>
                        <p className="text-sm">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.receipt} • {p.method} • {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{kes(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}