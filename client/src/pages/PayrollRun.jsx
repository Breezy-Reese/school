import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { PageHeader, Card, Badge, ErrorMsg, btn, btnGhost } from '../components/UI';
import api from '../api/axios';
import { monthLabel } from './Payroll';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
const n = (v) => Number(v) || 0;

export default function PayrollRun() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (data) => {
    setRun(data);
    setEntries(data.entries.map((e) => ({ _id: e._id, name: e.name, role: e.role, basic: e.basic, allowances: e.allowances, deductions: e.deductions, note: e.note || '' })));
  };

  useEffect(() => {
    api.get(`/payroll/${id}`).then((r) => apply(r.data)).catch((e) => setMsg(e.response?.data?.message || 'Could not load payroll'));
  }, [id]);

  const draft = run?.status === 'draft';
  const set = (i, key) => (e) => setEntries((list) => list.map((x, j) => (j === i ? { ...x, [key]: e.target.value } : x)));
  const net = (e) => n(e.basic) + n(e.allowances) - n(e.deductions);
  const total = (key) => entries.reduce((s, e) => s + n(e[key]), 0);

  const call = async (fn, success) => {
    setBusy(true); setMsg(''); setOk('');
    try { const r = await fn(); apply(r.data); if (success) setOk(success); }
    catch (err) { setMsg(err.response?.data?.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const save = () => call(() => api.put(`/payroll/${id}/entries`, { entries }), 'Saved.');
  const sync = () => call(() => api.post(`/payroll/${id}/sync`), 'Staff list updated.');
  const finalize = async () => {
    if (!window.confirm(`Finalize payroll for ${monthLabel(run.month)}?\n\nThis records ${kes(total('basic') + total('allowances') - total('deductions'))} as a Salaries expense and locks the run.`)) return;
    await save();
    call(() => api.post(`/payroll/${id}/finalize`), 'Payroll finalized and recorded as an expense.');
  };
  const remove = async () => {
    if (!window.confirm('Delete this draft payroll?')) return;
    try { await api.delete(`/payroll/${id}`); navigate('/payroll'); }
    catch (err) { setMsg(err.response?.data?.message || 'Could not delete'); }
  };

  if (!run) return msg ? <ErrorMsg>{msg}</ErrorMsg> : <p className="text-sm text-slate-400">Loading...</p>;

  const cell = 'w-28 border border-slate-300 rounded-md px-2 py-1 text-sm text-right';

  return (
    <div className="max-w-6xl">
      <Link to="/payroll" className={`${btnGhost} inline-flex items-center gap-2 mb-4`}><ArrowLeft size={16} /> All pay runs</Link>
      <PageHeader
        title={`Payroll, ${monthLabel(run.month)}`}
        subtitle={draft ? 'Draft: adjust the figures, then finalize' : `Finalized by ${run.finalizedBy}`}
        action={
          <div className="flex items-center gap-3">
            <Badge tone={draft ? 'amber' : 'green'}>{draft ? 'Draft' : 'Finalized'}</Badge>
            <Link to={`/payroll/${id}/payslips`} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Payslips</Link>
          </div>
        }
      />
      <ErrorMsg>{msg}</ErrorMsg>
      {ok && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{ok}</p>}

      <Card>
        <div className="overflow-x-auto -m-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2 text-right">Basic pay</th>
                <th className="px-4 py-2 text-right">Allowances</th>
                <th className="px-4 py-2 text-right">Deductions</th>
                <th className="px-4 py-2 text-right">Net pay</th>
                <th className="px-4 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e._id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{e.name}<span className="block text-[11px] text-slate-400">{e.role}</span></td>
                  {['basic', 'allowances', 'deductions'].map((k) => (
                    <td key={k} className="px-4 py-2 text-right">
                      {draft ? <input type="number" min="0" step="0.01" value={e[k]} onChange={set(i, k)} className={cell} /> : kes(e[k])}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold">{kes(net(e))}</td>
                  <td className="px-4 py-2">
                    {draft ? <input value={e.note} onChange={set(i, 'note')} maxLength={120} className="w-40 border border-slate-300 rounded-md px-2 py-1 text-sm" /> : <span className="text-xs text-slate-500">{e.note}</span>}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td className="px-4 py-2">Total ({entries.length})</td>
                <td className="px-4 py-2 text-right">{kes(total('basic'))}</td>
                <td className="px-4 py-2 text-right">{kes(total('allowances'))}</td>
                <td className="px-4 py-2 text-right">{kes(total('deductions'))}</td>
                <td className="px-4 py-2 text-right">{kes(total('basic') + total('allowances') - total('deductions'))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {draft && (
        <div className="flex flex-wrap justify-between gap-3 pb-8">
          <div className="flex gap-3">
            <button onClick={sync} disabled={busy} className={btnGhost}>Add newly hired staff</button>
            <button onClick={remove} disabled={busy} className="px-4 py-2 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50">Delete draft</button>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy} className={btnGhost}>Save changes</button>
            <button onClick={finalize} disabled={busy} className={btn}>Finalize payroll</button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Enter statutory deductions (PAYE, NSSF, SHIF, housing levy, loans) as a total per person under Deductions. The system does not calculate them,
        because the rates change. Finalizing records the net total under Expenses as Salaries.
      </p>
    </div>
  );
}