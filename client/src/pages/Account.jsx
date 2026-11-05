import { useState } from 'react';
import { PageHeader, Card, Label, ErrorMsg, btn, field } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const roleLabel = { superadmin: 'Super Admin', admin: 'Admin', teacher: 'Teacher', accountant: 'Accountant' };

export default function Account() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setDone(false);
    if (form.newPassword !== form.confirm) return setMsg('New passwords do not match');
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg('');
      setDone(true);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not change password');
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="My Account" subtitle={`${user.name} • ${user.email} • ${roleLabel[user.role]}`} />
      <ErrorMsg>{msg}</ErrorMsg>
      {done && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Password changed.</p>}

      <Card title="Change Password">
        <form onSubmit={submit} className="space-y-4">
          <Label text="Current Password"><input name="currentPassword" type="password" required value={form.currentPassword} onChange={set} className={field} /></Label>
          <Label text="New Password"><input name="newPassword" type="password" minLength={8} required value={form.newPassword} onChange={set} className={field} /></Label>
          <Label text="Confirm New Password"><input name="confirm" type="password" minLength={8} required value={form.confirm} onChange={set} className={field} /></Label>
          <button className={btn}>Update Password</button>
        </form>
      </Card>
    </div>
  );
}