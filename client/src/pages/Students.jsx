import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { PageHeader, Card, SearchBox, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';

const tone = { Active: 'green', Transferred: 'amber', 'Passed Out': 'slate' };

export default function Students() {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const { data: classes } = useFetch('/classes');
  const { data: rows, error } = useFetch('/students', { q, class: cls });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="All Students"
        subtitle="Browse and manage enrolled students"
        action={<Link to="/students/new" className={`${btn} flex items-center gap-2`}><UserPlus size={16} /> New Admission</Link>}
      />
      <ErrorMsg>{error}</ErrorMsg>
      <Card
        title={`Students (${rows.length})`}
        right={
          <div className="flex gap-3">
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={`${field} !w-36 !py-1.5`}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
            <SearchBox value={q} onChange={setQ} placeholder="Search name or adm no" />
          </div>
        }
      >
        <Table
          rows={rows}
          columns={[
            { label: 'Adm No', key: 'admNo' },
            { label: 'Name', key: 'name' },
            { label: 'Class', key: 'class' },
            { label: 'Gender', key: 'gender' },
            { label: 'Phone', key: 'phone' },
            { label: 'Status', render: (s) => <Badge tone={tone[s.status]}>{s.status}</Badge> },
          ]}
        />
      </Card>
    </div>
  );
}