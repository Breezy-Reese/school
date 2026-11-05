import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Label, SearchBox, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];
const refHint = {
  'M-Pesa': 'M-Pesa transaction code',
  'Bank Transfer': 'Bank reference number',
  Cheque: 'Cheque number',
  Card: 'Card approval code',
  Cash: 'Not needed for cash',
};

export default function FeeCollection() {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState({ due: 0, paid: 0, balance: 0 });
  const [form, setForm] = useState({ amount: '', method: 'M-Pesa', ref: '' });
  const [msg, setMsg] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);

  const { data: found } = useFetch('/students', { q }, !!q);
  const { data: payments, reload } = useFetch('/payments');
  const matches = q ? found : [];

  const byMethod = payments.reduce((acc, p) => {
    const m = p.method || 'Other';
    acc[m] = (acc[m] || 0) + p.amount;
    return acc;
  }, {});

  const loadSummary = async (admNo) => {
    const { data } = await api.get(`/payments/summary/${admNo}`);
    setSummary(data);
  };

  const choose = (s) => { setSelected(s); setQ(''); setMsg(''); setLastReceipt(null); loadSummary(s.admNo); };

  const pay = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/payments', { admNo: selected.admNo, ...form });
      setLastReceipt(data.receipt);
      setForm({ amount: '', method: form.method, ref: '' });
      setMsg('');
      await Promise.all([reload(), loadSummary(selected.admNo)]);
    } catch (err) { setMsg(err.response?.data?.message || 'Could not record payment'); }
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="Fee Collection" subtitle="Find a student and record a payment" />
      <ErrorMsg>{msg}</ErrorMsg>

      <Card title="Find Student" right={<SearchBox value={q} onChange={setQ} placeholder="Name or adm no" />}>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-400">Search for a student, then click their name to record a payment.</p>
        ) : (
          <div className="space-y-2">
            {matches.map((s) => (
              <button key={s._id} onClick={() => choose(s)} className="w-full text-left border border-slate-200 rounded-lg px-3 py-2 hover:bg-blue-50">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-slate-500 ml-2">{s.admNo} • {s.class}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <Card
          title={`${selected.name} (${selected.admNo})`}
          right={
            <div className="flex items-center gap-3">
              <Link to={`/fees/statement/${selected.admNo}`} className="text-sm text-blue-600 hover:underline">Fee statement</Link>
              <Badge tone="blue">{selected.class}</Badge>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Term 1 fee</p><p className="font-bold">KES {summary.due.toLocaleString()}</p></div>
            <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-700">Paid</p><p className="font-bold text-green-800">KES {summary.paid.toLocaleString()}</p></div>
            <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-700">Balance</p><p className="font-bold text-red-800">KES {summary.balance.toLocaleString()}</p></div>
          </div>
          <form onSubmit={pay} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <Label text="Amount (KES)">
              <input type="number" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field} />
            </Label>
            <Label text="Payment Method">
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value, ref: '' })} className={field}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Label>
            <Label text={form.method === 'Cash' ? 'Reference (optional)' : 'Reference'}>
              <input
                value={form.ref}
                required={form.method !== 'Cash'}
                onChange={(e) => setForm({ ...form, ref: e.target.value })}
                placeholder={refHint[form.method]}
                className={field}
              />
            </Label>
            <button className={btn}>Record Payment</button>
          </form>

          {lastReceipt && (
            <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              Payment recorded.{' '}
              <Link to={`/fees/receipt/${lastReceipt}`} className="font-semibold underline">Print receipt {lastReceipt}</Link>
            </p>
          )}
        </Card>
      )}

      {Object.keys(byMethod).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {Object.entries(byMethod).map(([method, total]) => (
            <div key={method} className="bg-white border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500">{method}</p>
              <p className="font-bold">KES {total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <Card title={`Payments (${payments.length})`}>
        <Table
          rows={payments}
          empty="No payments recorded yet."
          columns={[
            { label: 'Receipt', render: (p) => <Link to={`/fees/receipt/${p.receipt}`} className="text-blue-600 hover:underline">{p.receipt}</Link> },
            { label: 'Student', key: 'name' },
            { label: 'Amount', render: (p) => `KES ${p.amount.toLocaleString()}` },
            { label: 'Method', render: (p) => <Badge tone={p.method === 'Cash' ? 'amber' : 'blue'}>{p.method}</Badge> },
            { label: 'Reference', key: 'ref' },
            { label: 'Date', render: (p) => new Date(p.createdAt).toLocaleDateString() },
          ]}
        />
      </Card>
    </div>
  );
}