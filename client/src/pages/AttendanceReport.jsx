import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { PageHeader, Card, Table, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';

const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(d);

export default function AttendanceReport() {
  const { school } = useSettings();
  const { data: classes } = useFetch('/classes');
  const now = new Date();
  const [cls, setCls] = useState('');
  const [from, setFrom] = useState(day(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(day(now));
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { if (!cls && classes.length) setCls(classes[0].name); }, [classes, cls]);

  useEffect(() => {
    if (!cls) return;
    setD(null);
    api.get('/attendance/report', { params: { class: cls, from, to } })
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the report'));
  }, [cls, from, to]);

  const overall = d && d.students.reduce((a, s) => ({ ok: a.ok + s.present + s.late, all: a.all + s.marked }), { ok: 0, all: 0 });

  return (
    <div className="max-w-6xl">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold uppercase">{school.name}</h1>
        <p className="text-sm">Attendance report, {cls}, {from} to {to}</p>
      </div>

      <div className="no-print">
        <PageHeader
          title="Attendance Report"
          subtitle="How often each student was present"
          action={<button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Print</button>}
        />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={field}>
              {classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
          </div>
        </Card>
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-slate-200 rounded-lg p-3"><p className="text-xs text-slate-500">Days attendance was taken</p><p className="text-xl font-bold">{d.days}</p></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3"><p className="text-xs text-slate-500">Students</p><p className="text-xl font-bold">{d.students.length}</p></div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs text-blue-700">Class attendance rate</p><p className="text-xl font-bold text-blue-900">{overall.all ? `${Math.round((overall.ok / overall.all) * 100)}%` : '-'}</p></div>
          </div>

          <Card title="By student">
            <Table
              rows={d.students}
              empty="No students in this class."
              columns={[
                { label: 'Adm No', key: 'admNo' },
                { label: 'Name', key: 'name' },
                { label: 'Present', key: 'present' },
                { label: 'Late', key: 'late' },
                { label: 'Absent', key: 'absent' },
                { label: 'Days marked', key: 'marked' },
                {
                  label: 'Rate',
                  render: (s) => s.rate == null ? '-' : (
                    <span className={`font-semibold ${s.rate < 75 ? 'text-red-600' : s.rate < 90 ? 'text-amber-600' : 'text-green-700'}`}>{s.rate}%</span>
                  ),
                },
              ]}
            />
            <p className="text-xs text-slate-500 mt-6">Late counts as attended. Rates under 75% are shown in red.</p>
          </Card>

          {d.daily.length > 0 && (
            <Card title="By day">
              <Table
                rows={d.daily}
                columns={[
                  { label: 'Date', render: (x) => new Date(`${x.date}T12:00:00`).toLocaleDateString('en-GB') },
                  { label: 'Present', key: 'present' },
                  { label: 'Late', key: 'late' },
                  { label: 'Absent', key: 'absent' },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}