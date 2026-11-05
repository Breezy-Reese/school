import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { SCHOOL } from '../config';
import { amountInWords } from '../utils/words';
import { ErrorMsg, btn, btnGhost } from '../components/UI';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-dashed border-slate-200 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-right">{children || '-'}</span>
    </div>
  );
}

export default function Receipt() {
  const { receipt } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/payments/receipt/${receipt}`)
      .then((r) => setD(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Could not load the receipt'));
  }, [receipt]);

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!d) return <p className="text-sm text-slate-400">Loading...</p>;

  const { payment: p, student, year, due, paid, balance } = d;
  const date = new Date(p.paymentDate || p.createdAt);

  return (
    <div className="max-w-2xl">
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/fees/payments" className={`${btnGhost} flex items-center gap-2`}><ArrowLeft size={16} /> Back</Link>
        <button onClick={() => window.print()} className={`${btn} flex items-center gap-2`}><Printer size={16} /> Print receipt</button>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-8 print:border-0 print:p-0">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{SCHOOL.name}</h1>
          <p className="text-xs text-slate-600">{SCHOOL.address} • Tel: {SCHOOL.phone} • {SCHOOL.email}</p>
          <p className="mt-3 inline-block border border-slate-800 px-4 py-1 text-sm font-bold tracking-widest">OFFICIAL FEE RECEIPT</p>
        </div>

        <div className="flex justify-between mb-5 text-sm">
          <p><span className="text-slate-500">Receipt No:</span> <span className="font-bold">{p.receipt}</span></p>
          <p><span className="text-slate-500">Date:</span> <span className="font-medium">{date.toLocaleDateString('en-GB')}</span></p>
        </div>

        <Row label="Received from">{student?.name || p.name}</Row>
        <Row label="Admission No">{p.admNo}</Row>
        <Row label="Class">{p.class}</Row>
        <Row label="Term">{p.term}, {year}</Row>
        <Row label="Payment method">{p.method || 'Not recorded'}</Row>
        <Row label="Reference">{p.ref}</Row>

        <div className="my-6 p-4 bg-slate-50 border border-slate-300 rounded text-center">
          <p className="text-xs text-slate-500 uppercase">Amount received</p>
          <p className="text-3xl font-bold">{kes(p.amount)}</p>
          <p className="text-sm text-slate-600 mt-1">Kenya Shillings {amountInWords(p.amount)} only</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-sm mb-8">
          <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">{p.term} fees</p><p className="font-semibold">{kes(due)}</p></div>
          <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">Paid to date</p><p className="font-semibold">{kes(paid)}</p></div>
          <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">Balance</p><p className="font-semibold">{kes(balance)}</p></div>
        </div>

        <div className="flex justify-between items-end text-sm mt-10">
          <div>
            <p className="text-slate-500 text-xs">Received by</p>
            <p className="font-medium">{p.collectedBy || '-'}</p>
          </div>
          <div className="text-center">
            <div className="w-44 border-b border-slate-800 mb-1" />
            <p className="text-xs text-slate-500">Signature / Stamp</p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-8">Thank you. Fees paid are not refundable.</p>
      </div>
    </div>
  );
}