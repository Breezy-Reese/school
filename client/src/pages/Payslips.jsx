import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { ErrorMsg, btn, btnGhost } from '../components/UI';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';
import { monthLabel } from './Payroll';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

export default function Payslips() {
  const { id } = useParams();
  const { school } = useSettings();
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/payroll/${id}`).then((r) => setRun(r.data)).catch((e) => setError(e.response?.data?.message || 'Could not load payroll'));
  }, [id]);

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!run) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="no-print flex items-center justify-between mb-4">
        <Link to={`/payroll/${id}`} className={`${btnGhost} inline-flex items-center gap-2`}><ArrowLeft size={16} /> Back</Link>
        <button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Print all {run.entries.length} payslips</button>
      </div>
      {run.status === 'draft' && (
        <p className="no-print mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">This payroll is still a draft, so these payslips are marked DRAFT.</p>
      )}

      {run.entries.map((e, i) => (
        <div key={e._id} className="mb-6 print:mb-0" style={{ breakAfter: i < run.entries.length - 1 ? 'page' : 'auto' }}>
          <div className="bg-white border border-slate-300 rounded-lg p-8 print:border-0 print:p-0">
            <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
              <h1 className="text-2xl font-bold uppercase tracking-wide">{school.name}</h1>
              <p className="text-xs text-slate-600">{[school.address, school.phone && `Tel: ${school.phone}`].filter(Boolean).join(' • ')}</p>
              <p className="mt-3 inline-block border border-slate-800 px-4 py-1 text-sm font-bold tracking-widest">
                PAYSLIP, {monthLabel(run.month).toUpperCase()}{run.status === 'draft' ? ' (DRAFT)' : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><span className="text-slate-500 block text-xs">Employee</span><span className="font-semibold">{e.name}</span></p>
              <p><span className="text-slate-500 block text-xs">Position</span><span className="font-semibold">{e.role || '-'}</span></p>
            </div>

            <table className="w-full text-sm mb-4">
              <tbody>
                <tr className="border-b border-slate-100"><td className="py-2">Basic pay</td><td className="py-2 text-right">{kes(e.basic)}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2">Allowances</td><td className="py-2 text-right">{kes(e.allowances)}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2">Gross pay</td><td className="py-2 text-right">{kes((e.basic || 0) + (e.allowances || 0))}</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2">Deductions</td><td className="py-2 text-right">- {kes(e.deductions)}</td></tr>
                <tr className="font-bold text-base"><td className="py-3">Net pay</td><td className="py-3 text-right">{kes(e.net)}</td></tr>
              </tbody>
            </table>
            {e.note && <p className="text-xs text-slate-500 mb-4">Note: {e.note}</p>}

            <div className="flex justify-between items-end text-sm mt-12">
              <p className="text-xs text-slate-400">Generated {new Date().toLocaleDateString('en-GB')}</p>
              <div className="text-center"><div className="w-44 border-b border-slate-800 mb-1" /><p className="text-xs text-slate-500">Employee signature</p></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}