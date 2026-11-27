import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Label, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
export const monthLabel = (m) => new Date(`${m}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export default function Payroll() {
  const { data: runs, error, reload } = useFetch('/payroll');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState('');

  const start = async (e) => {
    e.preventDefault();
    setMsg('');
    try { await api.post('/payroll', { month }); await reload(); }
    catch (err) { setMsg(err.response?.data?.message || 'Could not start payroll'); }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="Payroll" subtitle="Monthly pay runs and payslips" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      <Card title="Start a month">
        <form onSubmit={start} className="flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <Label text="Month"><input type="month" required value={month} onChange={(e) => setMonth(e.target.value)} className={field} /></Label>
          </div>
          <button className={btn}>Start payroll</button>
        </form>
        <p className="text-xs text-slate-500 mt-3">The run is filled in from Staff Management, using each person's salary. You can adjust each person before finalizing.</p>
      </Card>

      <Card title="Pay runs">
        <Table
          rows={runs}
          empty="No payroll runs yet."
          columns={[
            { label: 'Month', render: (r) => <Link to={`/payroll/${r._id}`} className="text-blue-600 hover:underline font-medium">{monthLabel(r.month)}</Link> },
            { label: 'Staff', key: 'staff' },
            { label: 'Net pay', render: (r) => <b>{kes(r.totals.net)}</b> },
            { label: 'Status', render: (r) => <Badge tone={r.status === 'finalized' ? 'green' : 'amber'}>{r.status === 'finalized' ? 'Finalized' : 'Draft'}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}