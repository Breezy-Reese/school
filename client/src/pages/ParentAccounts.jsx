import { useState } from 'react';
import { PageHeader, Card, Label, Table, Badge, ErrorMsg, btn, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const blank = { name: '', email: '', password: '', admNos: '' };

export default function ParentAccounts() {
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const { data: parents, reload } = useFetch('/parents');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Runs an action, shows the server's error message if it fails, then refreshes the list
  const run = async (action, fallback, success) => {
    setMsg(''); setOk('');
    try {
      await action();
      if (success) setOk(success);
      await reload();
    } catch (err) { setMsg(err.response?.data?.message || fallback); }
  };

  const create = (e) => {
    e.preventDefault();
    run(
      async () => { await api.post('/parents', form); setForm(blank); },
      'Could not create the account',
      `Account created for ${form.name}. Give them the email and password. They can change it under My account.`,
    );
  };

  const addChild = (p) => {
    const admNo = window.prompt(`Admission number to link to ${p.name}:`);
    if (!admNo) return;
    run(() => api.post(`/parents/${p._id}/children`, { admNo: admNo.trim() }), 'Could not link the student');
  };

  const removeChild = (p, c) => {
    if (!window.confirm(`Unlink ${c.name} from ${p.name}?`)) return;
    run(() => api.delete(`/parents/${p._id}/children/${encodeURIComponent(c.admNo)}`), 'Could not unlink the student');
  };

  const resetPassword = (p) => {
    const password = window.prompt(`New password for ${p.name} (at least 8 characters):`);
    if (!password) return;
    run(() => api.patch(`/parents/${p._id}`, { password }), 'Could not reset the password', `Password reset for ${p.name}.`);
  };

  const toggle = (p) =>
    run(() => api.patch(`/parents/${p._id}`, { active: !p.active }), 'Could not update the account');

  return (
    <div className="max-w-6xl">
      <PageHeader title="Parent Accounts" subtitle="Give parents a login to see their own children's fees" />
      <ErrorMsg>{msg}</ErrorMsg>
      {ok && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{ok}</p>}

      <Card title="Create a parent account">
        <form onSubmit={create} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Label text="Parent's name">
              <input required value={form.name} onChange={set('name')} className={field} />
            </Label>
            <Label text="Email (they log in with this)">
              <input type="email" required value={form.email} onChange={set('email')} className={field} />
            </Label>
            <Label text="Temporary password (min 8 characters)">
              <input required minLength={8} value={form.password} onChange={set('password')} autoComplete="off" className={field} />
            </Label>
            <Label text="Children's admission numbers">
              <input required value={form.admNos} onChange={set('admNos')} placeholder="ADM-26-1002, ADM-26-1003" className={field} />
            </Label>
          </div>
          <button className={btn}>Create account</button>
          <p className="text-xs text-slate-500">
            Separate several admission numbers with commas. A parent can only ever see the students linked here.
          </p>
        </form>
      </Card>

      <Card title={`Parent accounts (${parents.length})`}>
        <Table
          rows={parents}
          empty="No parent accounts yet."
          columns={[
            { label: 'Parent', render: (p) => <span>{p.name}<span className="block text-[11px] text-slate-400">{p.email}</span></span> },
            {
              label: 'Children',
              render: (p) => (
                <div className="flex flex-wrap gap-2">
                  {p.children.map((c) => (
                    <span key={c.admNo} className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1">
                      {c.name} <span className="text-slate-400">{c.admNo}{c.class ? ` • ${c.class}` : ''}</span>
                      <button type="button" onClick={() => removeChild(p, c)} className="text-red-600 ml-1" title="Unlink">✕</button>
                    </span>
                  ))}
                </div>
              ),
            },
            { label: 'Status', render: (p) => <Badge tone={p.active ? 'blue' : 'amber'}>{p.active ? 'Active' : 'Deactivated'}</Badge> },
            {
              label: '',
              render: (p) => (
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={() => addChild(p)} className="text-blue-600 hover:underline">Add child</button>
                  <button type="button" onClick={() => resetPassword(p)} className="text-blue-600 hover:underline">Reset password</button>
                  <button type="button" onClick={() => toggle(p)} className="text-red-600 hover:underline">{p.active ? 'Deactivate' : 'Activate'}</button>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}