import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PageHeader, Card, Label, Table, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const heads = ['Tuition', 'Boarding', 'Activity', 'Exam', 'Transport', 'Uniform'];

export default function FeeStructure() {
  const { data: classes } = useFetch('/classes');
  const { data: items, error, reload } = useFetch('/fee-items');
  const [form, setForm] = useState({ class: '', head: '', term: 'Term 1', amount: '' });
  const [msg, setMsg] = useState('');
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fee-items', { ...form, amount: Number(form.amount) });
      setForm({ ...form, head: '', amount: '' });
      setMsg('');
      reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not add item'); }
  };

  const remove = async (id) => { await api.delete(`/fee-items/${id}`); reload(); };

  const totals = classes
    .map((c) => ({ c: c.name, total: items.filter((i) => i.class === c.name && i.term === 'Term 1').reduce((s, i) => s + i.amount, 0) }))
    .filter((t) => t.total > 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Fee Structure" subtitle="Set fee heads and amounts per class" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      <Card title="Add Fee Item">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <Label text="Class">
            <select name="class" value={form.class} onChange={set} required className={field}>
              <option value="">Select</option>{classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
          </Label>
          <Label text="Fee Head">
            <select name="head" value={form.head} onChange={set} required className={field}>
              <option value="">Select</option>{heads.map((h) => <option key={h}>{h}</option>)}
            </select>
          </Label>
          <Label text="Term">
            <select name="term" value={form.term} onChange={set} className={field}>
              {['Term 1', 'Term 2', 'Term 3'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Label>
          <Label text="Amount (KES)">
            <input name="amount" type="number" min="0" value={form.amount} onChange={set} required className={field} />
          </Label>
          <button className={btn}>Add</button>
        </form>
      </Card>

      {totals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {totals.map(({ c, total }) => (
            <div key={c} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">{c} Term 1 total</p>
              <p className="text-lg font-bold text-blue-900">KES {total.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <Card title="Fee Items">
        <Table
          rows={items}
          columns={[
            { label: 'Class', key: 'class' },
            { label: 'Fee Head', key: 'head' },
            { label: 'Term', key: 'term' },
            { label: 'Amount', render: (i) => `KES ${i.amount.toLocaleString()}` },
            { label: '', render: (i) => <button onClick={() => remove(i._id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button> },
          ]}
        />
      </Card>
    </div>
  );
}