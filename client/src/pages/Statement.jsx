import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import useFetch from '../hooks/useFetch';
import { SCHOOL } from '../config';
import { ErrorMsg, btn, btnGhost, field } from '../components/UI';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

export default function Statement() {
  const { admNo } = useParams();
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const { data: years } = useFetch('/payments/years');

  // Include next year so balances brought forward can be viewed after promotion
  const yearOptions = [...new Set([...years, new Date().getFullYear() + 1])].sort((a, b) => b - a);

  useEffect(() => {
    api.get(`/payments/statement/${admNo}`, { params: { term, year } })
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the statement'));
  }, [admNo, term, year]);

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!d) return <p className="text-sm text-slate-400">Loading...</p>;

  const { student, items, payments, due, paid, balance, termFee, broughtForward } = d;

  return (
    <div className="max-w-3xl">
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/fees/collection" className={`${btnGhost} flex items-center gap-2`}><ArrowLeft size={16} /> Back</Link>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(e.target.value)} className={`${field} !w-28 !py-1.5`}>
            {yearOptions.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${field} !w-32 !py-1.5`}>
            {['Term 1', 'Term 2', 'Term 3'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => window.print()} className={`${btn} flex items-center gap-2`}><Printer size={16} /> Print</button>
        </div>
      </div>

      <div className="print-area bg-white border border-slate-300 rounded-lg p-8">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{SCHOOL.name}</h1>
          <p className="text-xs text-slate-600">{SCHOOL.address} • Tel: {SCHOOL.phone} • {SCHOOL.email}</p>
          <p className="mt-3 inline-block border border-slate-800 px-4 py-1 text-sm font-bold tracking-widest">FEE STATEMENT - {term.toUpperCase()} {d.year}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
          <p><span className="text-slate-500 block text-xs">Student</span><span className="font-semibold">{student.name}</span></p>
          <p><span className="text-slate-500 block text-xs">Admission No</span><span className="font-semibold">{student.admNo}</span></p>
          <p><span className="text-slate-500 block text-xs">Class (that term)</span><span className="font-semibold">{d.class}</span></p>
        </div>

        <h3 className="font-semibold text-sm mb-2">Fees charged</h3>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-1">Item</th><th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {broughtForward !== 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5">Balance brought forward</td>
                <td className="py-1.5 text-right">{kes(broughtForward)}</td>
              </tr>
            )}
            {items.length === 0 && termFee === 0 && broughtForward === 0 && (
              <tr><td colSpan={2} className="py-3 text-slate-400">No fee recorded for this class and term.</td></tr>
            )}
            {items.length === 0 && termFee > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-1.5">Term fee (as recorded)</td>
                <td className="py-1.5 text-right">{kes(termFee)}</td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i._id} className="border-b border-slate-100">
                <td className="py-1.5">{i.head}</td>
                <td className="py-1.5 text-right">{kes(i.amount)}</td>
              </tr>
            ))}
            <tr className="font-bold"><td className="py-2">Total charged</td><td className="py-2 text-right">{kes(due)}</td></tr>
          </tbody>
        </table>

        <h3 className="font-semibold text-sm mb-2">Payments received</h3>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-1">Date</th><th className="py-1">Receipt</th><th className="py-1">Method</th>
              <th className="py-1">Reference</th><th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-400">No payments for this term.</td></tr>}
            {payments.map((p) => (
              <tr key={p._id} className="border-b border-slate-100">
                <td className="py-1.5">{new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="py-1.5">{p.receipt}</td>
                <td className="py-1.5">{p.method || '-'}</td>
                <td className="py-1.5">{p.ref || '-'}</td>
                <td className="py-1.5 text-right">{kes(p.amount)}</td>
              </tr>
            ))}
            <tr className="font-bold"><td colSpan={4} className="py-2">Total paid</td><td className="py-2 text-right">{kes(paid)}</td></tr>
          </tbody>
        </table>

        <div className={`p-4 rounded border text-center ${balance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs uppercase text-slate-500">{balance > 0 ? 'Balance due' : balance < 0 ? 'Overpaid' : 'Fully paid'}</p>
          <p className="text-2xl font-bold">{kes(Math.abs(balance))}</p>
        </div>
        <p className="text-xs text-slate-400 mt-6 text-center">Statement generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </div>
  );
}