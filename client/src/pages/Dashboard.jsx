import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Table, Badge, ErrorMsg } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

function Stat({ label, value, tone = 'slate', hint }) {
  const tones = {
    slate: 'bg-white border-slate-200 text-slate-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
  };
  return (
    <div className={`border rounded-lg p-3 ${tones[tone]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-xs opacity-70 mt-0.5">{hint}</p>}
    </div>
  );
}

function QuickLink({ to, children }) {
  return (
    <Link to={to} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-blue-700 hover:bg-blue-50">
      {children}
    </Link>
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

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!d) return <p className="text-sm text-slate-400">Loading...</p>;

  const { students, attendance, fees, admin } = d;
  const maxMonth = fees ? Math.max(...fees.monthly.map((m) => m.amount), 1) : 1;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Dashboard" subtitle={`${d.term}, ${d.year}`} />

      {/* Quick actions by role */}
      <div className="flex flex-wrap gap-2 mb-5">
        {can(['admin']) && <QuickLink to="/students/new">+ New admission</QuickLink>}
        {can(['admin', 'accountant']) && <QuickLink to="/fees/collection">Record payment</QuickLink>}
        {can(['admin', 'accountant']) && <QuickLink to="/fees/reports">Reports</QuickLink>}
        {can(['admin', 'teacher']) && <QuickLink to="/academics/attendance">Take attendance</QuickLink>}
        {can(['admin', 'teacher']) && <QuickLink to="/academics/marks">Marks entry</QuickLink>}
        {can(['admin']) && <QuickLink to="/students/promotion">Promotion</QuickLink>}
      </div>

      {/* Fees: admin + accountant */}
      {fees && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat label="Collected today" value={kes(fees.today)} tone="green" hint={`${fees.todayCount} payment(s)`} />
            <Stat label="Collected this month" value={kes(fees.thisMonth)} tone="blue" />
            <Stat label={`${fees.term} outstanding`} value={kes(fees.outstanding)} tone="red" hint={fees.rate != null ? `${fees.rate}% collected` : undefined} />
            <Stat label="Students with a balance" value={fees.defaulters} tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <Card title="Collections, last 6 months">
              <div className="flex items-end gap-3 h-40">
                {fees.monthly.map((m) => (
                  <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] text-slate-500 mb-1">{m.amount ? Number(m.amount).toLocaleString() : ''}</span>
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max((m.amount / maxMonth) * 100, m.amount ? 3 : 0)}%` }} />
                    <span className="text-xs text-slate-500 mt-1">{m.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Recent payments" right={<Link to="/fees/payments" className="text-sm text-blue-600 hover:underline">View all →</Link>}>
              <Table
                rows={fees.recentPayments}
                empty="No payments yet."
                columns={[
                  { label: 'Receipt', render: (p) => <Link to={`/fees/receipt/${p.receipt}`} className="text-blue-600 hover:underline">{p.receipt}</Link> },
                  { label: 'Student', key: 'name' },
                  { label: 'Amount', render: (p) => kes(p.amount) },
                  { label: 'Method', render: (p) => (p.method ? <Badge tone={p.method === 'Cash' ? 'amber' : 'blue'}>{p.method}</Badge> : '-') },
                ]}
              />
            </Card>
          </div>
        </>
      )}

      {/* Attendance: admin + teacher */}
      {attendance && (
        <Card title={`Attendance today (${attendance.date})`} right={<Link to="/academics/attendance" className="text-sm text-blue-600 hover:underline">Take attendance →</Link>}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <Stat label="Classes marked" value={attendance.classesMarked} />
            <Stat label="Students marked" value={attendance.marked} />
            <Stat label="Present or late" value={attendance.attended} tone="green" />
            <Stat label="Attendance rate" value={attendance.rate != null ? `${attendance.rate}%` : '-'} tone="blue" />
          </div>
          {attendance.unmarkedClasses.length > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Not yet marked today: {attendance.unmarkedClasses.join(', ')}
            </p>
          )}
        </Card>
      )}

      {/* Students: everyone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Students">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Stat label="Active students" value={students.active} tone="blue" />
            <Stat label={`New in ${d.year}`} value={students.newAdmissions} />
          </div>
          <Table
            rows={students.byClass}
            empty="No students yet."
            columns={[
              { label: 'Class', key: 'class' },
              { label: 'Students', key: 'count' },
            ]}
          />
        </Card>

        <div className="space-y-5">
          {admin && (
            <Card title="Administration">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Open enquiries" value={admin.openEnquiries} tone="amber" />
                <Stat label="Staff" value={admin.staff} />
              </div>
            </Card>
          )}
          <Card title="Recently admitted">
            <Table
              rows={students.recent}
              empty="No students yet."
              columns={[
                { label: 'Adm No', key: 'admNo' },
                { label: 'Name', key: 'name' },
                { label: 'Class', key: 'class' },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}