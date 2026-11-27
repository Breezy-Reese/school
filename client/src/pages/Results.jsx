import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { PageHeader, Card, Table, Badge, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';
import { TERMS, currentTerm, currentYear, yearOptions } from '../utils/term';

const tone = { A: 'green', B: 'green', C: 'blue', D: 'amber', E: 'red' };

export default function Results() {
  const { school } = useSettings();
  const { can } = useAuth();
  const { data: classes } = useFetch('/classes');
  const [cls, setCls] = useState('');
  const [term, setTerm] = useState(currentTerm());
  const [year, setYear] = useState(String(currentYear()));
  const [d, setD] = useState(null);
  const [rel, setRel] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!cls && classes.length) setCls(classes[0].name); }, [classes, cls]);

  useEffect(() => {
    if (!cls) return;
    setD(null);
    const params = { class: cls, term, year };
    Promise.all([api.get('/results/class', { params }), api.get('/results/release', { params })])
      .then(([res, release]) => { setD(res.data); setRel(release.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the results'));
  }, [cls, term, year]);

  const toggleRelease = async () => {
    const next = !rel.published;
    const text = next
      ? `Release ${cls} ${term} ${year} results to parents? They will see each child's report card.`
      : 'Withdraw these results from parents?';
    if (!window.confirm(text)) return;
    setBusy(true);
    try {
      const { data } = await api.put('/results/release', { class: cls, term, year, published: next });
      setRel(data);
    } catch (err) { setError(err.response?.data?.message || 'Could not update'); }
    finally { setBusy(false); }
  };

  const columns = d ? [
    { label: 'Pos', render: (s) => <b>{s.position}</b> },
    { label: 'Name', render: (s) => <Link to={`/academics/report-card/${s.admNo}?term=${encodeURIComponent(term)}&year=${year}`} className="text-blue-600 hover:underline">{s.name}</Link> },
    ...d.subjects.map((sub) => ({ label: sub, render: (s) => s.averages[sub] ?? '-' })),
    { label: 'Total', key: 'total' },
    { label: 'Mean', render: (s) => <b>{s.mean}</b> },
    { label: 'Grade', render: (s) => <Badge tone={tone[s.grade]}>{s.grade}</Badge> },
  ] : [];

  return (
    <div className="max-w-full">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold uppercase">{school.name}</h1>
        <p className="text-sm">Class results, {cls}, {term} {year}</p>
      </div>

      <div className="no-print">
        <PageHeader
          title="Class Results"
          subtitle="Averages, positions and grades for a class"
          action={<button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Print</button>}
        />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={field}>
              {classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className={field}>
              {TERMS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={field}>
              {yearOptions().map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </Card>
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {d && rel && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4 bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="text-sm">
            {rel.published
              ? <span className="text-green-700 font-medium">Released to parents{rel.by ? ` by ${rel.by}` : ''}</span>
              : <span className="text-slate-600">Not released. Parents can't see these results yet.</span>}
          </div>
          {can(['admin']) && (
            <button onClick={toggleRelease} disabled={busy || d.students.length === 0} className={`${rel.published ? 'px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50' : btn} disabled:opacity-50`}>
              {rel.published ? 'Withdraw from parents' : 'Release to parents'}
            </button>
          )}
        </div>
      )}

      {d && (
        <Card title={`${d.class}: ${d.students.length} student(s)${d.classMean != null ? `, class mean ${d.classMean}` : ''}`}>
          <Table rows={d.students} columns={columns} empty="No marks have been entered for this class, term and year." />
          {d.subjectMeans.length > 0 && (
            <p className="text-xs text-slate-500 mt-6">
              Subject means: {d.subjectMeans.map((s) => `${s.subject} ${s.mean ?? '-'}`).join(' • ')}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}