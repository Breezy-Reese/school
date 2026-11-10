import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Smartphone, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import api from '../api/axios';
import useFetch from '../hooks/useFetch';
import { ErrorMsg, Label, field } from '../components/UI';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
const MAX_TRIES = 40; // 40 checks x 3 seconds = 2 minutes
const pendingKey = (admNo) => `mpesaPending:${admNo}`;

function PayForm({ admNo }) {
  const { data: kids, loading, error } = useFetch('/portal/children');
  const child = kids.find((c) => c.admNo === admNo);

  // A payment in progress survives a page refresh
  const saved = () => {
    try { return JSON.parse(sessionStorage.getItem(pendingKey(admNo))); } catch { return null; }
  };

  const [amount, setAmount] = useState(() => saved()?.amount || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('mpesaPhone') || '');
  const [requestId, setRequestId] = useState(() => saved()?.id || null);
  const [stage, setStage] = useState(() => (saved() ? 'waiting' : 'form')); // form | waiting | success | failed | timeout
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = (next, data = null) => {
    sessionStorage.removeItem(pendingKey(admNo));
    setResult(data);
    setStage(next);
  };

  // Ask the server every 3 seconds whether the payment has gone through
  useEffect(() => {
    if (stage !== 'waiting' || !requestId) return undefined;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await api.get(`/portal/mpesa/${requestId}`);
        if (data.status === 'success') { finish('success', data); return; }
        if (data.status === 'failed' || data.status === 'error') { finish('failed', data); return; }
      } catch (err) {
        if (err.response?.status === 404) { finish('form'); return; } // unknown request: start over
      }
      if (tries >= MAX_TRIES) finish('timeout');
    }, 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, requestId]);

  const pay = async (e) => {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      const { data } = await api.post('/portal/mpesa/stk', { admNo, amount, phone });
      localStorage.setItem('mpesaPhone', phone);
      sessionStorage.setItem(pendingKey(admNo), JSON.stringify({ id: data.id, amount }));
      setRequestId(data.id);
      setStage('waiting');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not start the payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setRequestId(null); setResult(null); setMsg(''); setStage('form'); };

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (!child) {
    return (
      <div>
        <Link to="/portal" className="text-sm text-blue-600 hover:underline">← Back</Link>
        <p className="mt-4 text-sm text-slate-500">Student not found on your account.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-green-600 text-white p-5 flex items-center gap-3">
          <Smartphone size={24} />
          <div>
            <h1 className="font-bold text-lg">Pay fees with M-Pesa</h1>
            <p className="text-sm text-green-100">A prompt will appear on your phone</p>
          </div>
        </div>

        <div className="p-5">
          {stage === 'form' && (
            <form onSubmit={pay} className="space-y-4">
              <ErrorMsg>{msg}</ErrorMsg>

              <Label text="Student name">
                <input value={child.name} readOnly tabIndex={-1} className={`${field} !bg-slate-100 text-slate-600`} />
              </Label>
              <Label text="Admission number">
                <input value={child.admNo} readOnly tabIndex={-1} className={`${field} !bg-slate-100 text-slate-600`} />
              </Label>

              <Label text="Amount (KES)">
                <input
                  type="number" min="1" max="150000" step="1" required inputMode="numeric"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000" className={field}
                />
              </Label>
              {child.balance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(child.balance)))}
                  className="text-sm text-blue-600 hover:underline -mt-2"
                >
                  Pay the full balance ({kes(child.balance)})
                </button>
              )}

              <Label text="M-Pesa phone number">
                <input
                  type="tel" required inputMode="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678" className={field}
                />
              </Label>
              <p className="text-xs text-slate-500 -mt-2">The number that will receive the M-Pesa PIN prompt.</p>

              <button
                disabled={busy}
                className="w-full rounded-xl bg-green-600 text-white font-semibold py-3 hover:bg-green-700 disabled:opacity-60"
              >
                {busy ? 'Sending request...' : amount ? `Pay ${kes(amount)} with M-Pesa` : 'Pay with M-Pesa'}
              </button>
            </form>
          )}

          {stage === 'waiting' && (
            <div className="text-center py-6">
              <Loader2 size={44} className="mx-auto animate-spin text-green-600" />
              <h2 className="font-semibold text-lg mt-4">Check your phone</h2>
              <p className="text-sm text-slate-600 mt-1">
                Enter your M-Pesa PIN to {amount ? <>pay <b>{kes(amount)}</b></> : 'complete the payment'} for {child.name}.
              </p>
              <p className="text-xs text-slate-400 mt-4">Don't close this page. It updates automatically.</p>
            </div>
          )}

          {stage === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="mx-auto text-green-600" />
              <h2 className="font-semibold text-lg mt-3">Payment received</h2>
              <p className="text-sm text-slate-600 mt-1">{kes(result?.amount)} for {child.name}</p>
              {result?.mpesaReceipt && (
                <p className="text-xs text-slate-500 mt-2">M-Pesa code: <b>{result.mpesaReceipt}</b></p>
              )}
              <div className="flex flex-col gap-2 mt-5">
                {result?.receipt && (
                  <Link
                    to={`/portal/receipt/${result.receipt}`}
                    className="rounded-xl bg-blue-600 text-white font-semibold py-2.5 hover:bg-blue-700"
                  >
                    View receipt {result.receipt}
                  </Link>
                )}
                <Link to="/portal" className="text-sm text-blue-600 hover:underline">Back to my children</Link>
              </div>
            </div>
          )}

          {stage === 'failed' && result?.status === 'error' && (
            <div className="text-center py-6">
              <AlertTriangle size={48} className="mx-auto text-amber-500" />
              <h2 className="font-semibold text-lg mt-3">We received your payment</h2>
              <p className="text-sm text-slate-600 mt-1">
                It could not be recorded automatically. Please contact the school office
                {result.mpesaReceipt ? <> and quote the M-Pesa code <b>{result.mpesaReceipt}</b></> : null}.
              </p>
              <Link to="/portal" className="inline-block mt-5 text-sm text-blue-600 hover:underline">Back to my children</Link>
            </div>
          )}

          {stage === 'failed' && result?.status !== 'error' && (
            <div className="text-center py-6">
              <XCircle size={48} className="mx-auto text-red-500" />
              <h2 className="font-semibold text-lg mt-3">Payment not completed</h2>
              <p className="text-sm text-slate-600 mt-1">{result?.resultDesc || 'The payment was cancelled or failed.'}</p>
              <p className="text-xs text-slate-400 mt-1">You have not been charged.</p>
              <button onClick={reset} className="mt-5 rounded-xl bg-green-600 text-white font-semibold px-6 py-2.5 hover:bg-green-700">
                Try again
              </button>
            </div>
          )}

          {stage === 'timeout' && (
            <div className="text-center py-6">
              <Clock size={48} className="mx-auto text-amber-500" />
              <h2 className="font-semibold text-lg mt-3">Still waiting for confirmation</h2>
              <p className="text-sm text-slate-600 mt-1">
                If M-Pesa deducted money, your receipt will appear under <b>Receipts</b> shortly.
                Please don't pay again until you've checked.
              </p>
              <div className="flex flex-col items-center gap-2 mt-5 text-sm">
                <Link to={`/portal/payments/${child.admNo}`} className="text-blue-600 hover:underline">Check my receipts</Link>
                <button onClick={reset} className="text-slate-500 hover:underline">Start a new payment</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// key={admNo} gives each child's payment page a clean state
export default function PortalPay() {
  const { admNo } = useParams();
  return <PayForm key={admNo} admNo={admNo} />;
}