import { useEffect, useState } from 'react';
import { PageHeader, Card, Label, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const grade = (m) => {
  if (m === '' || m === undefined) return '-';
  const n = Number(m);
  if (n >= 80) return 'A';
  if (n >= 70) return 'B';
  if (n >= 60) return 'C';
  if (n >= 50) return 'D';
  return 'E';
};
const tone = { A: 'green', B: 'green', C: 'blue', D: 'amber', E: 'red' };

export default function Marks() {
  const [cls, setCls] = useState('');
  const [subject, setSubject] = useState('');
  const [exam, setExam] = useState('Mid-Term');
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: classes } = useFetch('/classes');
  const { data: subjects } = useFetch('/subjects');
  const { data: list } = useFetch('/students', { class: cls, status: 'Active' }, !!cls);

  useEffect(() => { if (!cls && classes.length) setCls(classes[0].name); }, [classes, cls]);
  useEffect(() => { if (!subject && subjects.length) setSubject(subjects[0].name); }, [subjects, subject]);

  useEffect(() => {
    if (!cls || !subject) return;
    api.get('/marks', { params: { class: cls, subject, exam } }).then((r) => {
      setMarks(Object.fromEntries(r.data.map((m) => [m.admNo, String(m.score)])));
      setSaved(false);
    });
  }, [cls, subject, exam]);

  const change = (id, value) => {
    if (value !== '' && (Number(value) < 0 || Number(value) > 100)) return;
    setMarks({ ...marks, [id]: value });
    setSaved(false);
  };

  const save = async () => {
    try {
      await api.put('/marks', {
        class: cls, subject, exam,
        marks: list.map((s) => ({ admNo: s.admNo, score: marks[s.admNo] ?? '' })),
      });
      setSaved(true); setMsg('');
    } catch (err) { setMsg(err.response?.data?.message || 'Could not save marks'); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Marks Entry" subtitle="Enter exam marks out of 100" />
      <ErrorMsg>{msg}</ErrorMsg>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Label text="Class">
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={field}>
              {classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
          </Label>
          <Label text="Subject">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={field}>
              {subjects.map((s) => <option key={s._id}>{s.name}</option>)}
            </select>
          </Label>
          <Label text="Exam">
            <select value={exam} onChange={(e) => setExam(e.target.value)} className={field}>
              {['Opener', 'Mid-Term', 'End-Term'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Label>
        </div>
      </Card>

      <Card title={`${cls} • ${subject} • ${exam}`}>
        <Table
          rows={list}
          empty="No active students in this class."
          columns={[
            { label: 'Adm No', key: 'admNo' },
            { label: 'Name', key: 'name' },
            {
              label: 'Marks (/100)',
              render: (s) => (
                <input
                  type="number"
                  value={marks[s.admNo] ?? ''}
                  onChange={(e) => change(s.admNo, e.target.value)}
                  className="w-24 border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ),
            },
            {
              label: 'Grade',
              render: (s) => {
                const g = grade(marks[s.admNo]);
                return g === '-' ? '-' : <Badge tone={tone[g]}>{g}</Badge>;
              },
            },
          ]}
        />
        <div className="flex items-center justify-end gap-3 mt-8">
          {saved && <span className="text-sm text-green-600">Marks saved</span>}
          <button onClick={save} className={btn}>Save Marks</button>
        </div>
      </Card>
    </div>
  );
}