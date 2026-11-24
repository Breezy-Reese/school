import { useState } from 'react';
import { PageHeader, Card, Label, SearchBox, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const CATEGORIES = ['Salaries', 'Utilities', 'Supplies', 'Maintenance', 'Transport', 'Food', 'Learning materials', 'Other'];
const METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'Card'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
const blank = () => ({ date: today(), category: '', description: '', amount: '', method: 'Cash', reference: '', paidTo: '' });

export default function Expenses() {
  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState(blank());
  const [year, setYear] = useState(String(thisYear));
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  const { data: rows, error, reload } = useFetch('/expenses', { year, month, category, q });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const active = rows.filter((r) => !r.voided);
  const total = active.reduce((s, r) => s + r.amount, 0);
  const byCategory = active.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + r.amount; return acc; }, {});

  const add = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/expenses', form);
      setForm({ ...blank(), date: form.date, method: form.method });
      await reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not save the expense'); }
  };

  const voidIt = async (r) => {
    const reason = window.prompt(`Void this expense (${kes(r.amount)} for ${r.description})?\nWhy is it being voided?`);
    if (!reason) return;
    setMsg('');
    try { await api.post(`/expenses/${r._id}/void`, { reason }); await reload(); }
    catch (err) { setMsg(err.response?.data?.message || 'Could not void the expense'); }
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="Expenses" subtitle="Record what the school spends" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      <Card title="Record an expense">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Label text="Date"><input type="date" required max={today()} value={form.date} onChange={set('date')} className={field} /></Label>
          <Label text="Category">
            <select required value={form.category} onChange={set('category')} className={field}>
              <option value="">Select</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Label>
          <div className="lg:col-span-2">
            <Label text="What was it for?">
              <input required value={form.description} onChange={set('description')} placeholder="e.g. Electricity bill for October" className={field} />
            </Label>
          </div>
          <Label text="Amount (KES)"><input type="number" min="1" step="0.01" required value={form.amount} onChange={set('amount')} className={field} /></Label>
          <Label text="Paid by">
            <select value={form.method} onChange={set('method')} className={field}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Label>
          <Label text="Paid to (optional)"><input value={form.paidTo} onChange={set('paidTo')} placeholder="Supplier or person" className={field} /></Label>
          <Label text="Reference (optional)"><input value={form.reference} onChange={set('reference')} placeholder="Receipt or M-Pesa code" className={field} /></Label>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end"><button className={btn}>Save expense</button></div>
        </form>
      </Card>

      <Card
        title="Filter"
        right={<SearchBox value={q} onChange={setQ} placeholder="Description, supplier or reference" />}
      >
        <div className="grid grid-cols-3 gap-3 max-w-xl">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={field}>
            {[0, 1, 2, 3, 4].map((i) => <option key={i}>{thisYear - i}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={field}>
            <option value="">All months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">Total spent ({active.length})</p>
          <p className="text-xl font-bold text-red-900">{kes(total)}</p>
        </div>
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, amt]) => (
          <div key={c} className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">{c}</p>
            <p className="font-bold">{kes(amt)}</p>
          </div>
        ))}
      </div>

      <Card title="Expenses">
        <Table
          rows={rows}
          empty="No expenses match these filters."
          columns={[
            { label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-GB') },
            { label: 'Category', render: (r) => <Badge tone="blue">{r.category}</Badge> },
            {
              label: 'Details',
              render: (r) => (
                <span className={r.voided ? 'line-through text-slate-400' : ''}>
                  {r.description}
                  <span className="block text-[11px] text-slate-400 no-underline">
                    {[r.paidTo, r.method, r.reference].filter(Boolean).join(' • ')}
                  </span>
                  {r.voided && <span className="block text-[11px] text-red-600 no-underline">Voided by {r.voidedBy}: {r.voidReason}</span>}
                </span>
              ),
            },
            { label: 'Amount', render: (r) => <span className={r.voided ? 'line-through text-slate-400' : 'font-medium'}>{kes(r.amount)}</span> },
            { label: 'Recorded by', key: 'recordedBy' },
            {
              label: '',
              render: (r) => (r.voided ? null : (
                <button onClick={() => voidIt(r)} className="text-xs text-red-600 hover:underline">Void</button>
              )),
            },
          ]}
        />
      </Card>
      {rows.length === 500 && <p className="text-xs text-slate-400">Showing the latest 500. Narrow the filters to see more.</p>}
    </div>
  );
}