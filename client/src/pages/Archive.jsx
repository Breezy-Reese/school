import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, SearchBox, Table, Badge, ErrorMsg } from '../components/UI';
import useFetch from '../hooks/useFetch';

const TABS = ['Passed Out', 'Transferred'];

export default function Archive() {
  const [status, setStatus] = useState('Passed Out');
  const [q, setQ] = useState('');
  const { data: rows, error } = useFetch('/students', { status, q });

  return (
    <div className="max-w-6xl">
      <PageHeader title="Passed Out Archive" subtitle="Students who have finished or left the school" />
      <ErrorMsg>{error}</ErrorMsg>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setStatus(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${status === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card title={`${status} (${rows.length})`} right={<SearchBox value={q} onChange={setQ} placeholder="Search name or adm no" />}>
        <Table
          rows={rows}
          empty={`No ${status.toLowerCase()} students.`}
          columns={[
            { label: 'Adm No', key: 'admNo' },
            { label: 'Name', render: (s) => <Link to={`/students/${s._id}`} className="text-blue-600 hover:underline">{s.name}</Link> },
            { label: 'Last class', key: 'class' },
            { label: 'Gender', key: 'gender' },
            { label: 'Phone', key: 'phone' },
            { label: 'Status', render: (s) => <Badge tone={s.status === 'Transferred' ? 'amber' : 'slate'}>{s.status}</Badge> },
          ]}
        />
      </Card>
      <p className="text-xs text-slate-400 mt-3">Students move here when their status is set to Passed Out or Transferred, from their profile or through Promotion.</p>
    </div>
  );
}