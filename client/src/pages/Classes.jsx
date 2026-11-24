import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PageHeader, Card, Label, Table, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

export default function Classes() {
  const { data: classes, error, reload } = useFetch('/classes');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const run = async (action) => {
    setMsg('');
    try { await action(); await reload(); }
    catch (err) { setMsg(err.response?.data?.message || 'Something went wrong'); }
  };

  const add = (e) => {
    e.preventDefault();
    run(async () => { await api.post('/classes', { name }); setName(''); });
  };
  const setOrder = (c, value) => {
    const order = Number(value);
    if (value === '' || !Number.isFinite(order) || order === c.order) return;
    run(() => api.patch(`/classes/${c._id}`, { order }));
  };
  const remove = (c) => {
    if (window.confirm(`Delete ${c.name}?`)) run(() => api.delete(`/classes/${c._id}`));
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Classes" subtitle="The classes your school teaches" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      <Card title="Add a class">
        <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
          <div className="w-64">
            <Label text="Class name">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 5, Form 3, PP1" className={field} />
            </Label>
          </div>
          <button className={btn}>Add class</button>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          Set the fees for a new class under Fee Structure. A class can't be renamed, because students and payments refer to its name.
        </p>
      </Card>

      <Card title={`Classes (${classes.length})`}>
        <Table
          rows={classes}
          empty="No classes yet."
          columns={[
            { label: 'Class', key: 'name' },
            { label: 'Students', key: 'students' },
            {
              label: 'Order',
              render: (c) => (
                <input
                  key={`${c._id}-${c.order}`}
                  type="number"
                  defaultValue={c.order}
                  onBlur={(e) => setOrder(c, e.target.value)}
                  className="w-20 border border-slate-300 rounded-md px-2 py-1 text-sm"
                />
              ),
            },
            {
              label: '',
              render: (c) => (
                <button onClick={() => remove(c)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}