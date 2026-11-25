import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import ReportCardView from '../components/ReportCardView';
import { ErrorMsg, btn, btnGhost, field } from '../components/UI';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';
import { TERMS, currentTerm, currentYear, yearOptions } from '../utils/term';

export default function PortalResults() {
  const { admNo } = useParams();
  const { school } = useSettings();
  const [term, setTerm] = useState(currentTerm());
  const [year, setYear] = useState(String(currentYear()));
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setD(null);
    api.get(`/portal/academics/results/${admNo}`, { params: { term, year } })
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the results'));
  }, [admNo, term, year]);

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link to="/portal" className={`${btnGhost} inline-flex items-center gap-2`}><ArrowLeft size={16} /> Back</Link>
        <div className="flex items-center gap-3">
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${field} !w-32 !py-1.5`}>
            {TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={`${field} !w-28 !py-1.5`}>
            {yearOptions().map((y) => <option key={y}>{y}</option>)}
          </select>
          {d?.released && <button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Print</button>}
        </div>
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {d && !d.released && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h2 className="font-semibold text-lg">Results not released yet</h2>
          <p className="text-sm text-slate-500 mt-1">
            {d.student?.name}'s results for {d.term} {d.year} haven't been released. The school will make them available when they are ready.
          </p>
        </div>
      )}
      {d?.released && <ReportCardView d={d} school={school} />}
    </div>
  );
}