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
const blank = { amount: '', method: 'M-Pesa', ref: '', paymentDate: '', term: 'Term 1', className: '', termFee: '' };
const today = () => new Date().toISOString().slice(0, 10);

export default function FeeCollection() {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState({ due: 0, paid: 0, balance: 0 });
  const [form, setForm] = useState(blank);
  const [old, setOld] = useState(false);
  const [msg, setMsg] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);

  const { data: found } = useFetch('/students', { q }, !!q);
  const { data: classes } = useFetch('/classes');
  const { data: payments, reload } = useFetch('/payments');
  const matches = q ? found : [];

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const loadSummary = async (admNo) => {
    const { data } = await api.get(`/payments/summary/${admNo}`);
    setSummary(data);
  };

  const choose = (s) => { setSelected(s); setQ(''); setMsg(''); setLastReceipt(null); loadSummary(s.admNo); };

  const pay = async (e) => {
    e.preventDefault();
    try {
      const payload = { admNo: selected.admNo, amount: form.amount, method: form.method, ref: form.ref };
      if (old) {
        Object.assign(payload, {
          paymentDate: form.paymentDate,
          term: form.term,
          className: form.className || selected.class,
          termFee: form.termFee,
        });
      }
      const { data } = await api.post('/payments', payload);
      setLastReceipt(data.receipt);
      setForm({ ...form, amount: '', ref: '' });
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
            <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Term 1 fee (this year)</p><p className="font-bold">KES {summary.due.toLocaleString()}</p></div>
            <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-700">Paid</p><p className="font-bold text-green-800">KES {summary.paid.toLocaleString()}</p></div>
            <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-700">Balance</p><p className="font-bold text-red-800">KES {summary.balance.toLocaleString()}</p></div>
          </div>

          <form onSubmit={pay} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <Label text="Amount (KES)">
                <input type="number" min="1" required value={form.amount} onChange={set('amount')} className={field} />
              </Label>
              <Label text="Payment Method">
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value, ref: '' })} className={field}>
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Label>
              <Label text={form.method === 'Cash' ? 'Reference (optional)' : 'Reference'}>
                <input value={form.ref} required={form.method !== 'Cash'} onChange={set('ref')} placeholder={refHint[form.method]} className={field} />
              </Label>
              <button className={btn}>Record Payment</button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={old} onChange={(e) => setOld(e.target.checked)} />
              This is an older payment (previous term or year)
            </label>

            {old && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Label text="Payment Date">
                  <input type="date" required max={today()} value={form.paymentDate} onChange={set('paymentDate')} className={field} />
                </Label>
                <Label text="Term">
                  <select value={form.term} onChange={set('term')} className={field}>
                    {['Term 1', 'Term 2', 'Term 3'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Label>
                <Label text="Class at that time">
                  <select value={form.className} onChange={set('className')} className={field}>
                    <option value="">Current ({selected.class})</option>
                    {classes.map((c) => <option key={c._id}>{c.name}</option>)}
                  </select>
                </Label>
                <Label text="Term fee at that time (KES)">
                  <input type="number" min="0" value={form.termFee} onChange={set('termFee')} placeholder="Optional" className={field} />
                </Label>
                <p className="sm:col-span-4 text-xs text-amber-800">
                  Tip: put the original paper receipt number in <b>Reference</b> so the two can be matched.
                  The term fee is used for the balance on the receipt; leave it blank to use the current fee structure.
                </p>
              </div>
            )}
          </form>

          {lastReceipt && (
            <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              Payment recorded.{' '}
              <Link to={`/fees/receipt/${lastReceipt}`} className="font-semibold underline">Print receipt {lastReceipt}</Link>
            </p>
          )}
        </Card>
      )}

      <Card
        title="Recent Payments"
        right={<Link to="/fees/payments" className="text-sm text-blue-600 hover:underline">View all payment history →</Link>}
      >
        <Table
          rows={payments.slice(0, 10)}
          empty="No payments recorded yet."
          columns={[
            { label: 'Receipt', render: (p) => <Link to={`/fees/receipt/${p.receipt}`} className="text-blue-600 hover:underline">{p.receipt}</Link> },
            { label: 'Student', key: 'name' },
            { label: 'Amount', render: (p) => `KES ${p.amount.toLocaleString()}` },
            { label: 'Method', render: (p) => p.method ? <Badge tone={p.method === 'Cash' ? 'amber' : 'blue'}>{p.method}</Badge> : <span className="text-slate-400">Not recorded</span> },
            { label: 'Reference', key: 'ref' },
            { label: 'Date', render: (p) => new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') },
          ]}
        />
      </Card>
    </div>
  );
}