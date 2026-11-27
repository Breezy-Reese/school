import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import ReportCardView from '../components/ReportCardView';
import { ErrorMsg, btn, btnGhost } from '../components/UI';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';

export default function ClassReportCards() {
  const [sp] = useSearchParams();
  const cls = sp.get('class');
  const term = sp.get('term');
  const year = sp.get('year');
  const { school } = useSettings();
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/results/class-cards', { params: { class: cls, term, year } })
      .then((r) => setCards(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Could not load the report cards'));
  }, [cls, term, year]);

  return (
    <div className="max-w-3xl">
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/academics/results" className={`${btnGhost} inline-flex items-center gap-2`}><ArrowLeft size={16} /> Class results</Link>
        {cards && cards.length > 0 && (
          <button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}>
            <Printer size={16} /> Print all {cards.length} report cards
          </button>
        )}
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      {!cards && !error && <p className="text-sm text-slate-400">Loading...</p>}
      {cards && cards.length === 0 && (
        <p className="text-sm text-slate-500">No marks have been entered for {cls}, {term} {year}.</p>
      )}

      {cards?.map((d, i) => (
        <div key={d.student.admNo} className="mb-6 print:mb-0" style={{ breakAfter: i < cards.length - 1 ? 'page' : 'auto' }}>
          <ReportCardView d={d} school={school} />
        </div>
      ))}
    </div>
  );
}