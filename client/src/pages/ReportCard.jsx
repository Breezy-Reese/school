import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import ReportCardView from '../components/ReportCardView';
import { ErrorMsg, btn, btnGhost, field } from '../components/UI';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';
import { TERMS, currentTerm, currentYear, yearOptions } from '../utils/term';

export default function ReportCard() {
  const { admNo } = useParams();
  const [sp] = useSearchParams();
  const { school } = useSettings();
  const [term, setTerm] = useState(sp.get('term') || currentTerm());
  const [year, setYear] = useState(sp.get('year') || String(currentYear()));
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/results/report-card/${admNo}`, { params: { term, year } })
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the report card'));
  }, [admNo, term, year]);

  return (
    <div className="max-w-3xl">
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/academics/results" className={`${btnGhost} inline-flex items-center gap-2`}><ArrowLeft size={16} /> Class results</Link>
        <div className="flex items-center gap-3">
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${field} !w-32 !py-1.5`}>
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={`${field} !w-28 !py-1.5`}>
            {yearOptions().map((y) => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Print</button>
        </div>
      </div>
      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}
      {d && <ReportCardView d={d} school={school} />}
    </div>
  );
}