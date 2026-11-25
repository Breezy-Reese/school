import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, Card, Table, Badge, ErrorMsg, btnGhost, field } from '../components/UI';
import api from '../api/axios';

const dayStr = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(d);
const tone = { Present: 'green', Late: 'amber', Absent: 'red' };

export default function PortalAttendance() {
  const { admNo } = useParams();
  const [days, setDays] = useState('30');
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setD(null);
    const from = dayStr(new Date(Date.now() - Number(days) * 86400000));
    api.get(`/portal/academics/attendance/${admNo}`, { params: { from, to: dayStr(new Date()) } })
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the attendance'));
  }, [admNo, days]);

  const s = d?.summary;

  return (
    <div>
      <div className="mb-4">
        <Link to="/portal" className={`${btnGhost} inline-flex items-center gap-2`}><ArrowLeft size={16} /> Back</Link>
      </div>
      <PageHeader
        title="Attendance"
        subtitle={d ? `${d.student.name} • ${d.student.class}` : `Admission No ${admNo}`}
        action={
          <select value={days} onChange={(e) => setDays(e.target.value)} className={`${field} !w-40`}>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        }
      />
      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-xs text-blue-700">Attendance rate</p><p className="text-2xl font-bold text-blue-900">{s.rate == null ? '-' : `${s.rate}%`}</p></div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4"><p className="text-xs text-green-700">Present</p><p className="text-2xl font-bold text-green-900">{s.present}</p></div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs text-amber-700">Late</p><p className="text-2xl font-bold text-amber-900">{s.late}</p></div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-xs text-red-700">Absent</p><p className="text-2xl font-bold text-red-900">{s.absent}</p></div>
          </div>

          <Card title={`Day by day (${s.marked} day${s.marked === 1 ? '' : 's'} recorded)`}>
            <Table
              rows={d.days}
              empty="No attendance has been recorded for this period."
              columns={[
                { label: 'Date', render: (x) => new Date(`${x.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Status', render: (x) => <Badge tone={tone[x.status]}>{x.status}</Badge> },
              ]}
            />
          </Card>
          <p className="text-xs text-slate-400 mt-3">Late counts as attended. Days with no record are days attendance wasn't taken.</p>
        </>
      )}
    </div>
  );
}