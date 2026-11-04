import { useEffect, useState } from 'react';
import { PageHeader, Card, Label, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const options = [
  { v: 'Present', on: 'bg-green-600 text-white' },
  { v: 'Absent', on: 'bg-red-600 text-white' },
  { v: 'Late', on: 'bg-amber-500 text-white' },
];

export default function Attendance() {
  const [cls, setCls] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: classes } = useFetch('/classes');
  const { data: list } = useFetch('/students', { class: cls, status: 'Active' }, !!cls);

  useEffect(() => { if (!cls && classes.length) setCls(classes[0].name); }, [classes, cls]);

  useEffect(() => {
    if (!cls) return;
    api.get('/attendance', { params: { class: cls, date } }).then((r) => {
      setMarks(Object.fromEntries(r.data.records.map((x) => [x.admNo, x.status])));
      setSaved(false);
    });
  }, [cls, date]);

  const get = (id) => marks[id] ?? 'Present';
  const count = (v) => list.filter((s) => get(s.admNo) === v).length;
  const setMark = (id, v) => { setMarks({ ...marks, [id]: v }); setSaved(false); };

  const save = async () => {
    try {
      await api.put('/attendance', {
        class: cls, date,
        records: list.map((s) => ({ admNo: s.admNo, status: get(s.admNo) })),
      });
      setSaved(true); setMsg('');
    } catch (err) { setMsg(err.response?.data?.message || 'Could not save attendance'); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Attendance" subtitle="Mark daily class attendance" />
      <ErrorMsg>{msg}</ErrorMsg>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Label text="Class">
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={field}>
              {classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
          </Label>
          <Label text="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </Label>
          <button onClick={() => { setMarks({}); setSaved(false); }} className={btnGhost}>Mark all present</button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-700">Present</p><p className="text-xl font-bold text-green-800">{count('Present')}</p></div>
        <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-700">Absent</p><p className="text-xl font-bold text-red-800">{count('Absent')}</p></div>
        <div className="bg-amber-50 rounded-lg p-3"><p className="text-xs text-amber-700">Late</p><p className="text-xl font-bold text-amber-800">{count('Late')}</p></div>
      </div>

      <Card title={`${cls} (${list.length} students)`}>
        {list.length === 0 && <p className="text-sm text-slate-400">No active students in this class.</p>}
        <ul className="divide-y divide-slate-100 -my-2">
          {list.map((s) => (
            <li key={s._id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-slate-500">{s.admNo}</p>
              </div>
              <div className="flex gap-1">
                {options.map(({ v, on }) => (
                  <button
                    key={v}
                    onClick={() => setMark(s.admNo, v)}
                    className={`px-3 py-1 text-xs rounded-md border ${get(s.admNo) === v ? `${on} border-transparent` : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end gap-3 mt-4">
          {saved && <span className="text-sm text-green-600">Attendance saved</span>}
          <button onClick={save} className={btn}>Save Attendance</button>
        </div>
      </Card>
    </div>
  );
}