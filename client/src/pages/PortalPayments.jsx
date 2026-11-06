import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, Card, Table, Badge, ErrorMsg, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

export default function PortalPayments() {
  const { admNo } = useParams();
  const [year, setYear] = useState('');
  const { data: years } = useFetch('/portal/years');
  const { data: rows, error } = useFetch(`/portal/payments/${admNo}`, { year });

  return (
    <div>
      <div className="mb-4">
        <Link to="/portal" className={`${btnGhost} inline-flex items-center gap-2`}><ArrowLeft size={16} /> Back</Link>
      </div>
      <PageHeader title="Payments and receipts" subtitle={`Admission No ${admNo}`} />
      <ErrorMsg>{error}</ErrorMsg>

      <Card
        title={`Payments (${rows.length})`}
        right={
          <select value={year} onChange={(e) => setYear(e.target.value)} className={`${field} !w-32 !py-1.5`}>
            <option value="">All years</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
        }
      >
        <Table
          rows={rows}
          empty="No payments found."
          columns={[
            { label: 'Receipt', render: (p) => <Link to={`/portal/receipt/${p.receipt}`} className="text-blue-600 hover:underline">{p.receipt}</Link> },
            { label: 'Date', render: (p) => new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') },
            { label: 'Term', key: 'term' },
            { label: 'Method', render: (p) => (p.method ? <Badge tone={p.method === 'Cash' ? 'amber' : 'blue'}>{p.method}</Badge> : '-') },
            { label: 'Reference', key: 'ref' },
            { label: 'Amount', render: (p) => kes(p.amount) },
          ]}
        />
      </Card>
    </div>
  );
}