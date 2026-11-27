import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { PageHeader, Card, Table, Badge, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';

const CHIPS = ['student', 'admNo', 'class', 'balance', 'term', 'school', 'paybill'];
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
const kes = (n) => Number(n || 0).toLocaleString();

export default function SmsReminders() {
  const { school, paymentSettings } = useSettings();
  const paybill = paymentSettings?.mpesa?.enabled ? paymentSettings.mpesa.paybill : '';

  const defaultText = paybill
    ? 'Dear Parent, {student} ({admNo}) has a {term} fee balance of KES {balance}. Pay via Paybill {paybill}, account {admNo}. Thank you. {school}'
    : 'Dear Parent, {student} ({admNo}) has a {term} fee balance of KES {balance}. Please clear it at the school office. Thank you. {school}';

  const [tab, setTab] = useState('send');
  const [status, setStatus] = useState(null);
  const [cls, setCls] = useState('');
  const [minBalance, setMinBalance] = useState('1');
  const [template, setTemplate] = useState(defaultText);
  const [selected, setSelected] = useState(new Set());
  const [force, setForce] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: classes } = useFetch('/classes');
  const { data: targets, error, reload } = useFetch('/sms/targets', { class: cls });
  const { data: history } = useFetch('/sms/log', {}, tab === 'history');

  useEffect(() => {
    api.get('/sms/status').then((r) => setStatus(r.data)).catch(() => setStatus({ configured: false }));
  }, []);

  const rows = targets.filter((t) => t.balance >= Number(minBalance || 0));
  const sendable = rows.filter((t) => t.validPhone);
  const chosen = rows.filter((t) => selected.has(t.admNo));
  const sample = chosen[0] || rows[0];

  const preview = sample && fill(template, {
    student: sample.name, admNo: sample.admNo, class: sample.class, term: sample.term,
    school: school.name, paybill: paybill || '', balance: kes(Math.round(sample.balance)),
  });
  const segments = Math.max(1, Math.ceil((preview || template).length / 160));

  const toggle = (admNo) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(admNo)) next.delete(admNo); else next.add(admNo);
    return next;
  });

  const send = async () => {
    if (!window.confirm(`Send this message to ${chosen.length} parent(s)? SMS costs money (about ${segments} message part(s) each).`)) return;
    setBusy(true);
    setMsg('');
    setResult(null);
    try {
      const { data } = await api.post('/sms/send', { admNos: chosen.map((c) => c.admNo), template, force });
      setResult(data);
      setSelected(new Set());
      reload();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not send the messages');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="SMS Fee Reminders" subtitle="Text parents who owe fees this term" />
      <ErrorMsg>{error || msg}</ErrorMsg>

      {status && !status.configured && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          SMS isn't set up on the server yet, so sending is disabled. Add <code>AT_USERNAME</code> and <code>AT_API_KEY</code> (Africa's Talking) to the server settings.
        </p>
      )}
      {status?.sandbox && <p className="mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">SMS is in sandbox mode. Messages are not delivered to real phones.</p>}

      <div className="flex gap-2 mb-4">
        {[['send', 'Send reminders'], ['history', 'History']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>

      {tab === 'history' && (
        <Card title={`Messages sent (${history.length})`}>
          <Table
            rows={history}
            empty="No messages have been sent yet."
            columns={[
              { label: 'When', render: (r) => new Date(r.createdAt).toLocaleString('en-GB') },
              { label: 'Student', render: (r) => <span>{r.studentName}<span className="block text-[11px] text-slate-400">{r.admNo}</span></span> },
              { label: 'To', key: 'to' },
              { label: 'Message', render: (r) => <span className="text-xs text-slate-600">{r.message}</span> },
              { label: 'Result', render: (r) => <Badge tone={r.status === 'sent' ? 'green' : 'red'}>{r.status === 'sent' ? 'Sent' : 'Failed'}</Badge> },
              { label: 'By', key: 'sentBy' },
            ]}
          />
        </Card>
      )}

      {tab === 'send' && (
        <>
          <Card title="1. The message">
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              maxLength={300}
              className={field}
            />
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">Insert:</span>
              {CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => setTemplate((t) => `${t} {${c}}`)} className="text-xs rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-50">{`{${c}}`}</button>
              ))}
              <button type="button" onClick={() => setTemplate(defaultText)} className="text-xs text-blue-600 hover:underline ml-auto">Reset message</button>
            </div>
            {preview && (
              <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] uppercase text-slate-400 mb-1">Preview for {sample.name}</p>
                <p className="text-sm">{preview}</p>
                <p className="text-xs text-slate-400 mt-1">{preview.length} characters, about {segments} message part{segments === 1 ? '' : 's'} per parent</p>
              </div>
            )}
          </Card>

          <Card
            title={`2. Choose parents (${rows.length} owe fees)`}
            right={
              <div className="flex items-center gap-2">
                <select value={cls} onChange={(e) => { setCls(e.target.value); setSelected(new Set()); }} className={`${field} !w-36 !py-1.5`}>
                  <option value="">All classes</option>
                  {classes.map((c) => <option key={c._id}>{c.name}</option>)}
                </select>
                <input type="number" min="0" value={minBalance} onChange={(e) => setMinBalance(e.target.value)} title="Minimum balance" className={`${field} !w-28 !py-1.5`} />
              </div>
            }
          >
            <div className="flex flex-wrap gap-3 mb-4 text-sm">
              <button type="button" onClick={() => setSelected(new Set(sendable.map((r) => r.admNo)))} className={btnGhost}>Select all with a phone number ({sendable.length})</button>
              <button type="button" onClick={() => setSelected(new Set())} className={btnGhost}>Clear</button>
            </div>
            <Table
              rows={rows}
              empty="Nobody owes fees for the current term."
              columns={[
                {
                  label: '',
                  render: (r) => (
                    <input type="checkbox" disabled={!r.validPhone} checked={selected.has(r.admNo)} onChange={() => toggle(r.admNo)} className="w-4 h-4" />
                  ),
                },
                { label: 'Student', render: (r) => <span>{r.name}<span className="block text-[11px] text-slate-400">{r.admNo}</span></span> },
                { label: 'Class', key: 'class' },
                { label: 'Phone', render: (r) => (r.validPhone ? r.phone : <span className="text-red-600 text-xs">No valid number</span>) },
                { label: 'Balance', render: (r) => <b>KES {kes(r.balance)}</b> },
                { label: 'Last texted', render: (r) => (r.lastSent ? new Date(r.lastSent).toLocaleDateString('en-GB') : '-') },
              ]}
            />
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-4 pb-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Send even if texted in the last 24 hours</label>
            <button onClick={send} disabled={busy || !status?.configured || chosen.length === 0} className={`${btn} inline-flex items-center gap-2 disabled:opacity-50`}>
              <MessageSquare size={16} /> {busy ? 'Sending...' : `Send to ${chosen.length} parent${chosen.length === 1 ? '' : 's'}`}
            </button>
          </div>

          {result && (
            <Card title={`Done: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`}>
              <Table
                rows={result.details}
                columns={[
                  { label: 'Student', key: 'name' },
                  { label: 'Result', render: (d) => <Badge tone={d.outcome === 'sent' ? 'green' : d.outcome === 'failed' ? 'red' : 'amber'}>{d.outcome}</Badge> },
                  { label: 'Detail', key: 'reason' },
                ]}
              />
            </Card>
          )}
          <p className="text-xs text-slate-400">The balance in each message is calculated by the server at the moment of sending, so it always matches the current records.</p>
        </>
      )}
    </div>
  );
}