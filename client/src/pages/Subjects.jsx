import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PageHeader, Card, Label, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const blank = { name: '', code: '', category: 'Compulsory' };

export default function Subjects() {
  const { data: items, error, reload } = useFetch('/subjects');
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState('');
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/subjects', form);
      setForm(blank); setMsg(''); reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not add subject'); }
  };
  const remove = async (id) => { await api.delete(`/subjects/${id}`); reload(); };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Subjects" subtitle="Manage the subjects taught in the school" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      <Card title="Add Subject">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <Label text="Subject Name"><input name="name" required value={form.name} onChange={set} className={field} /></Label>
          <Label text="Code"><input name="code" value={form.code} onChange={set} className={field} /></Label>
          <Label text="Category">
            <select name="category" value={form.category} onChange={set} className={field}>
              {['Compulsory', 'Science', 'Humanities', 'Technical', 'Language'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Label>
          <button className={btn}>Add Subject</button>
        </form>
      </Card>

      <Card title={`Subjects (${items.length})`}>
        <Table
          rows={items}
          columns={[
            { label: 'Subject', key: 'name' },
            { label: 'Code', key: 'code' },
            { label: 'Category', render: (s) => <Badge tone="blue">{s.category}</Badge> },
            { label: '', render: (s) => <button onClick={() => remove(s._id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button> },
          ]}
        />
      </Card>
    </div>
  );
}