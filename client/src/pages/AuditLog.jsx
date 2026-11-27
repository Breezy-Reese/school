import { useState } from 'react';
import { PageHeader, Card, Table, Badge, SearchBox, ErrorMsg, field } from '../components/UI';
import useFetch from '../hooks/useFetch';

const ENTITIES = ['students', 'payments', 'expenses', 'marks', 'attendance', 'results', 'users', 'parents', 'settings',
  'import', 'classes', 'subjects', 'staff', 'fee-items', 'enquiries', 'promotions', 'arrears', 'payroll', 'sms', 'portal'];
const methodTone = { POST: 'green', PUT: 'blue', PATCH: 'blue', DELETE: 'red' };

export default function AuditLog() {
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const [outcome, setOutcome] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: rows, error } = useFetch('/audit', { q, entity, outcome, from, to });

  const details = (s) => (s ? Object.entries(s).map(([k, v]) => `${k}: ${v}`).join(', ') : '');

  return (
    <div className="max-w-6xl">
      <PageHeader title="Audit Log" subtitle="Who changed what, and when" />
      <ErrorMsg>{error}</ErrorMsg>

      <Card title="Filter" right={<SearchBox value={q} onChange={setQ} placeholder="Search by person" />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className={field}>
            <option value="">All areas</option>
            {ENTITIES.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={field}>
            <option value="">All results</option>
            <option value="ok">Succeeded</option>
            <option value="denied">Refused (no permission)</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </div>
      </Card>

      <Card title={`Activity (${rows.length})`}>
        <Table
          rows={rows}
          empty="Nothing recorded for these filters."
          columns={[
            { label: 'When', render: (r) => new Date(r.createdAt).toLocaleString('en-GB') },
            { label: 'Who', render: (r) => <span>{r.userName || '-'}<span className="block text-[11px] text-slate-400 capitalize">{r.role}</span></span> },
            { label: 'Action', render: (r) => <span className="inline-flex items-center gap-2"><Badge tone={methodTone[r.method] || 'slate'}>{r.method}</Badge><code className="text-xs">{r.path}</code></span> },
            { label: 'Result', render: (r) => <Badge tone={r.status === 403 ? 'red' : 'green'}>{r.status === 403 ? 'Refused' : 'OK'}</Badge> },
            { label: 'Details', render: (r) => <span className="text-xs text-slate-500 break-words">{details(r.summary)}</span> },
          ]}
        />
      </Card>
      {rows.length === 300 && <p className="text-xs text-slate-400">Showing the latest 300. Narrow the filters to see older entries.</p>}
      <p className="text-xs text-slate-400 mt-2">Passwords, phone numbers and emails are never recorded in this log.</p>
    </div>
  );
}