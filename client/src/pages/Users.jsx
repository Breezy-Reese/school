import { useState } from 'react';
import { Trash2, KeyRound } from 'lucide-react';
import { PageHeader, Card, Label, Table, Badge, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const roleLabel = { superadmin: 'Super Admin', admin: 'Admin', teacher: 'Teacher', accountant: 'Accountant' };
const roleTone = { superadmin: 'red', admin: 'blue', teacher: 'green', accountant: 'amber' };
const blank = { name: '', email: '', password: '', role: 'teacher' };

export default function Users() {
  const { user: me } = useAuth();
  const { data: users, error, reload } = useFetch('/users');
  const [form, setForm] = useState(blank);
  const [msg, setMsg] = useState('');
  const [info, setInfo] = useState('');
  const [resetFor, setResetFor] = useState(null);
  const [newPass, setNewPass] = useState('');

  const isSuper = me.role === 'superadmin';
  const roles = isSuper ? ['superadmin', 'admin', 'teacher', 'accountant'] : ['admin', 'teacher', 'accountant'];
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const run = async (fn, okText = '') => {
    try { await fn(); setMsg(''); setInfo(okText); reload(); }
    catch (err) { setInfo(''); setMsg(err.response?.data?.message || 'Something went wrong'); }
  };

  const add = (e) => {
    e.preventDefault();
    run(async () => { await api.post('/users', form); setForm(blank); }, 'Account created. Share the password with the staff member privately.');
  };

  const changeRole = (u, role) => run(() => api.patch(`/users/${u._id}`, { role }));
  const toggle = (u) => run(() => api.patch(`/users/${u._id}`, { active: u.active === false }));
  const remove = (u) => {
    if (window.confirm(`Delete ${u.name}? This cannot be undone.`)) run(() => api.delete(`/users/${u._id}`));
  };
  const reset = (e) => {
    e.preventDefault();
    run(async () => { await api.post(`/users/${resetFor._id}/reset-password`, { password: newPass }); setResetFor(null); setNewPass(''); }, 'Password reset.');
  };

  return (
    <div className="max-w-6xl">
      <PageHeader title="Users & Roles" subtitle="Create logins for staff and control what they can access" />
      <ErrorMsg>{error || msg}</ErrorMsg>
      {info && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{info}</p>}

      <Card title="Create Staff Login">
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <Label text="Full Name"><input name="name" required value={form.name} onChange={set} className={field} /></Label>
          <Label text="Email"><input name="email" type="email" required value={form.email} onChange={set} className={field} /></Label>
          <Label text="Temporary Password">
            <input name="password" type="password" minLength={8} required value={form.password} onChange={set} placeholder="Min 8 characters" className={field} />
          </Label>
          <Label text="Role">
            <select name="role" value={form.role} onChange={set} className={field}>
              {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
          </Label>
          <button className={btn}>Create Account</button>
        </form>
      </Card>

      {resetFor && (
        <Card title={`Reset password for ${resetFor.name}`}>
          <form onSubmit={reset} className="flex flex-wrap gap-3 items-end">
            <Label text="New Password">
              <input type="password" minLength={8} required value={newPass} onChange={(e) => setNewPass(e.target.value)} className={field} />
            </Label>
            <button className={btn}>Save Password</button>
            <button type="button" onClick={() => { setResetFor(null); setNewPass(''); }} className={btnGhost}>Cancel</button>
          </form>
        </Card>
      )}

      <Card title={`Users (${users.length})`}>
        <Table
          rows={users}
          columns={[
            { label: 'Name', render: (u) => <span>{u.name}{u._id === me.id && <span className="text-xs text-slate-400"> (you)</span>}</span> },
            { label: 'Email', key: 'email' },
            {
              label: 'Role',
              render: (u) => {
                const locked = u._id === me.id || (u.role === 'superadmin' && !isSuper);
                return locked ? (
                  <Badge tone={roleTone[u.role]}>{roleLabel[u.role]}</Badge>
                ) : (
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="border border-slate-300 rounded-md px-2 py-1 text-sm">
                    {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                  </select>
                );
              },
            },
            { label: 'Status', render: (u) => <Badge tone={u.active === false ? 'slate' : 'green'}>{u.active === false ? 'Deactivated' : 'Active'}</Badge> },
            {
              label: '',
              render: (u) => {
                const locked = u._id === me.id || (u.role === 'superadmin' && !isSuper);
                return (
                  <div className="flex items-center gap-3 justify-end">
                    {!locked && (
                      <button onClick={() => toggle(u)} className="text-xs text-blue-600 hover:underline">
                        {u.active === false ? 'Activate' : 'Deactivate'}
                      </button>
                    )}
                    {(!locked || u._id === me.id) && u._id !== me.id && (
                      <button onClick={() => setResetFor(u)} title="Reset password" className="text-slate-500 hover:text-slate-700"><KeyRound size={15} /></button>
                    )}
                    {!locked && (
                      <button onClick={() => remove(u)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}