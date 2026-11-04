import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PageHeader, Card, Label, SearchBox, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const blank = { name: '', role: 'Teacher', phone: '', email: '', salary: '' };

export default function Staff() {
  const { data: items, error, reload } = useFetch('/staff');
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff', { ...form, salary: Number(form.salary) });
      setForm(blank); setMsg(''); reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not add staff member'); }
  };
  const remove = async (id) => { await api.delete(`/staff/${id}`); reload(); };

  const rows = items.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.role.toLowerCase().includes(q.toLowerCase()));
  const payroll = items.reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Staff Management" subtitle="Teaching and non-teaching staff" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      <div className="grid grid-cols-2 gap-3 mb-5 max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs text-blue-700">Total staff</p><p className="text-xl font-bold text-blue-900">{items.length}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-xs text-green-700">Monthly payroll</p><p className="text-xl font-bold text-green-900">KES {payroll.toLocaleString()}</p></div>
      </div>

      <Card title="Add Staff Member">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <Label text="Full Name"><input name="name" required value={form.name} onChange={set} className={field} /></Label>
          <Label text="Role">
            <select name="role" value={form.role} onChange={set} className={field}>
              {['Teacher', 'Principal', 'Deputy Principal', 'Accountant', 'Secretary', 'Support Staff'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Label>
          <Label text="Phone"><input name="phone" value={form.phone} onChange={set} className={field} /></Label>
          <Label text="Email"><input name="email" type="email" value={form.email} onChange={set} className={field} /></Label>
          <Label text="Salary (KES)"><input name="salary" type="number" min="0" required value={form.salary} onChange={set} className={field} /></Label>
          <button className={btn}>Add Staff</button>
        </form>
      </Card>

      <Card title={`Staff (${rows.length})`} right={<SearchBox value={q} onChange={setQ} placeholder="Search name or role" />}>
        <Table
          rows={rows}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Role', render: (s) => <Badge tone="blue">{s.role}</Badge> },
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Salary', render: (s) => `KES ${s.salary.toLocaleString()}` },
            { label: '', render: (s) => <button onClick={() => remove(s._id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button> },
          ]}
        />
      </Card>
    </div>
  );
}