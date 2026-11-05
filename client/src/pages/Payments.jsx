import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Table, Badge, SearchBox, ErrorMsg, field } from '../components/UI';
import useFetch from '../hooks/useFetch';

const METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];
const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

export default function Payments() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [term, setTerm] = useState('');
  const [method, setMethod] = useState('');

  const { data: years } = useFetch('/payments/years');
  const { data: rows, error } = useFetch('/payments', { q, year, term, method });

  const total = rows.reduce((s, p) => s + p.amount, 0);
  const byMethod = rows.reduce((acc, p) => {
    const m = p.method || 'Not recorded';
    acc[m] = (acc[m] || 0) + p.amount;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl">
      <PageHeader title="Payment History" subtitle="Find and reprint receipts from any year" />
      <ErrorMsg>{error}</ErrorMsg>

      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={field}>
            <option value="">All years</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={field}>
            <option value="">All terms</option>
            {['Term 1', 'Term 2', 'Term 3'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}>
            <option value="">All methods</option>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <div className="col-span-2"><SearchBox value={q} onChange={setQ} placeholder="Name, adm no, receipt or reference" /></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">Total ({rows.length} payments)</p>
          <p className="font-bold text-blue-900">{kes(total)}</p>
        </div>
        {Object.entries(byMethod).map(([m, amt]) => (
          <div key={m} className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">{m}</p>
            <p className="font-bold">{kes(amt)}</p>
          </div>
        ))}
      </div>

      <Card title="Payments">
        <Table
          rows={rows}
          empty="No payments match these filters."
          columns={[
            { label: 'Receipt', render: (p) => <Link to={`/fees/receipt/${p.receipt}`} className="text-blue-600 hover:underline">{p.receipt}</Link> },
            { label: 'Date', render: (p) => new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') },
            { label: 'Student', render: (p) => <span>{p.name}<span className="block text-[11px] text-slate-400">{p.admNo}</span></span> },
            { label: 'Class', key: 'class' },
            { label: 'Term', key: 'term' },
            { label: 'Method', render: (p) => p.method ? <Badge tone={p.method === 'Cash' ? 'amber' : 'blue'}>{p.method}</Badge> : <span className="text-slate-400">Not recorded</span> },
            { label: 'Reference', key: 'ref' },
            { label: 'Amount', render: (p) => kes(p.amount) },
            { label: 'Received by', key: 'collectedBy' },
          ]}
        />
      </Card>
      {rows.length === 500 && <p className="text-xs text-slate-400">Showing the latest 500. Narrow the filters to see older records.</p>}
    </div>
  );
}