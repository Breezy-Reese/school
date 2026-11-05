import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, Label, SearchBox, Table, Badge, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const kes = (n) => `KES ${Math.abs(Number(n || 0)).toLocaleString()}`;

export default function OpeningBalances() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ amount: '', note: '' });
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');

  const { data: found } = useFetch('/students', { q }, !!q);
  const { data: rows, reload } = useFetch('/arrears', { year });
  const matches = q ? found : [];

  const choose = (s) => { setSelected(s); setQ(''); setMsg(''); setOk(''); };

  const save = async (e) => {
    e.preventDefault();
    setMsg(''); setOk('');
    try {
      await api.post('/arrears', { admNo: selected.admNo, year, amount: form.amount, note: form.note });
      setOk(`Balance saved for ${selected.name}.`);
      setForm({ amount: '', note: '' });
      setSelected(null);
      await reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not save the balance'); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove the balance for ${row.name || row.admNo}?`)) return;
    setMsg(''); setOk('');
    try {
      await api.delete(`/arrears/${row._id}`);
      await reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not remove the balance'); }
  };

  const totalOwed = rows.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Opening Balances" subtitle="Fees owed (or paid in advance) before the system was used" />
      <ErrorMsg>{msg}</ErrorMsg>
      {ok && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{ok}</p>}

      <Card title="Add a balance" right={<SearchBox value={q} onChange={setQ} placeholder="Name or adm no" />}>
        {!selected && matches.length === 0 && (
          <p className="text-sm text-slate-400">Search for a student, then click their name.</p>
        )}
        {!selected && matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((s) => (
              <button key={s._id} onClick={() => choose(s)} className="w-full text-left border border-slate-200 rounded-lg px-3 py-2 hover:bg-blue-50">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-slate-500 ml-2">{s.admNo} • {s.class}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <form onSubmit={save} className="space-y-4">
            <p className="text-sm">
              <span className="font-semibold">{selected.name}</span>
              <span className="text-xs text-slate-500 ml-2">{selected.admNo} • {selected.class}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <Label text="Year it applies to">
                <input type="number" required value={year} onChange={(e) => setYear(e.target.value)} className={field} />
              </Label>
              <Label text="Amount (KES)">
                <input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Owed: 5000  Credit: -2000" className={field} />
              </Label>
              <Label text="Note (optional)">
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Term 3 2025 arrears" className={field} />
              </Label>
              <div className="flex gap-2">
                <button className={btn}>Save</button>
                <button type="button" onClick={() => setSelected(null)} className={btnGhost}>Cancel</button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              A positive amount means the student owes it. A negative amount means they paid in advance.
              The balance is added to <b>Term 1</b> of the year you choose. Saving again for the same student and year replaces the old amount.
            </p>
          </form>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">Students with a balance ({year})</p>
          <p className="font-bold text-blue-900">{rows.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">Total owed (brought forward)</p>
          <p className="font-bold text-red-800">{kes(totalOwed)}</p>
        </div>
      </div>

      <Card title={`Balances brought forward into ${year}`}>
        <Table
          rows={rows}
          empty="No balances for this year."
          columns={[
            { label: 'Adm No', key: 'admNo' },
            { label: 'Student', render: (x) => <Link to={`/fees/statement/${x.admNo}`} className="text-blue-600 hover:underline">{x.name || x.admNo}</Link> },
            { label: 'Class', key: 'class' },
            { label: 'Balance', render: (x) => <span className="font-semibold">{kes(x.amount)}</span> },
            { label: 'Type', render: (x) => <Badge tone={x.amount > 0 ? 'amber' : 'blue'}>{x.amount > 0 ? 'Owed' : 'Credit'}</Badge> },
            { label: 'Note', key: 'note' },
            { label: 'Set by', key: 'doneBy' },
            { label: '', render: (x) => <button onClick={() => remove(x)} className="text-sm text-red-600 hover:underline">Remove</button> },
          ]}
        />
      </Card>
    </div>
  );
}