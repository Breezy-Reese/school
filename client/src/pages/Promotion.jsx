import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { PageHeader, Card, Table, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

export default function Promotion() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sel, setSel] = useState([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');

  const { data: classes } = useFetch('/classes');
  const { data: students, reload: reloadStudents } = useFetch('/reports/class-list', { class: from }, !!from);
  const { data: log, reload: reloadLog } = useFetch('/promotions/log');

  const allSelected = students.length > 0 && sel.length === students.length;
  const toggle = (admNo) => setSel((s) => (s.includes(admNo) ? s.filter((x) => x !== admNo) : [...s, admNo]));

  const run = async (graduate) => {
    setMsg(''); setOk('');
    const what = graduate ? 'graduate' : `move to ${to}`;
    if (!window.confirm(`${sel.length} student(s) will ${what}. Continue?`)) return;
    try {
      const { data } = await api.post('/promotions', { admNos: sel, toClass: to, graduate, year });
      setOk(
        `${data.moved} student(s) updated.` +
        (data.carried ? ` Balances carried forward for ${data.carried} student(s).` : '')
      );
      setSel([]);
      await Promise.all([reloadStudents(), reloadLog()]);
    } catch (e) { setMsg(e.response?.data?.message || 'Could not complete the promotion'); }
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="Promotion" subtitle="Move students to the next class at the end of the year" />
      <ErrorMsg>{msg}</ErrorMsg>
      {ok && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{ok}</p>}

      <Card title="Promote students">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <select value={from} onChange={(e) => { setFrom(e.target.value); setSel([]); }} className={field}>
            <option value="">From class...</option>
            {classes.map((c) => <option key={c._id}>{c.name}</option>)}
          </select>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={field}>
            <option value="">To class...</option>
            {classes.filter((c) => c.name !== from).map((c) => <option key={c._id}>{c.name}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={field} title="Year being closed" />
        </div>

        {from && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => setSel(allSelected ? [] : students.map((s) => s.admNo))} className={btnGhost}>
                {allSelected ? 'Clear selection' : 'Select all'}
              </button>
              <span className="text-sm text-slate-500">{sel.length} of {students.length} selected</span>
              <div className="flex-1" />
              <button disabled={!sel.length || !to} onClick={() => run(false)} className={`${btn} disabled:opacity-40`}>Promote</button>
              <button disabled={!sel.length} onClick={() => run(true)} className={`${btnGhost} flex items-center gap-2 disabled:opacity-40`}>
                <GraduationCap size={16} /> Graduate
              </button>
            </div>
            <Table
              rows={students}
              empty="No active students in this class."
              columns={[
                { label: '', render: (s) => <input type="checkbox" checked={sel.includes(s.admNo)} onChange={() => toggle(s.admNo)} /> },
                { label: 'Adm No', key: 'admNo' },
                { label: 'Name', key: 'name' },
              ]}
            />
          </>
        )}
      </Card>

      <Card title="Promotion log">
        <Table
          rows={log}
          empty="No promotions yet."
          columns={[
            { label: 'Date', render: (p) => new Date(p.createdAt).toLocaleDateString('en-GB') },
            { label: 'Adm No', key: 'admNo' },
            { label: 'Student', key: 'name' },
            { label: 'From', key: 'fromClass' },
            { label: 'To', key: 'toClass' },
            { label: 'Year', key: 'year' },
            { label: 'By', key: 'doneBy' },
          ]}
        />
      </Card>
    </div>
  );
}