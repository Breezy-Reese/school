import { useEffect, useState } from 'react';
import { PageHeader, Card, Label, ErrorMsg, btn, field } from '../components/UI';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';

function Toggle({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4" />
      {children}
    </label>
  );
}

export default function Settings() {
  const { school, paymentSettings, reload, loaded } = useSettings();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  // Fill the form once the saved settings have loaded
  useEffect(() => {
    if (loaded && !form) {
      setForm({
        school: {
          name: school.name || '',
          address: school.address || '',
          phone: school.phone || '',
          email: school.email || '',
          receiptFooter: school.receiptFooter ?? '',
        },
        payment: JSON.parse(JSON.stringify(paymentSettings)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (!form) return <p className="text-sm text-slate-400">Loading...</p>;

  const setSchool = (key) => (e) =>
    setForm((f) => ({ ...f, school: { ...f.school, [key]: e.target.value } }));

  const setPay = (group, key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, payment: { ...f.payment, [group]: { ...f.payment[group], [key]: value } } }));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setOk('');
    try {
      await api.put('/settings', form);
      await reload();
      setOk('Settings saved. Receipts, statements and the parent portal now use these details.');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save the settings');
    } finally {
      setBusy(false);
    }
  };

  const { mpesa, bank, office } = form.payment;

  return (
    <form onSubmit={save} className="max-w-4xl">
      <PageHeader title="Settings" subtitle="School details and how parents can pay" />
      <ErrorMsg>{msg}</ErrorMsg>
      {ok && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{ok}</p>}

      <Card title="School details">
        <p className="text-xs text-slate-500 mb-4">Shown on receipts, fee statements and the parent portal.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Label text="School name">
            <input required value={form.school.name} onChange={setSchool('name')} className={field} />
          </Label>
          <Label text="Postal address">
            <input value={form.school.address} onChange={setSchool('address')} placeholder="P.O. Box 000-00000, Town" className={field} />
          </Label>
          <Label text="Phone">
            <input value={form.school.phone} onChange={setSchool('phone')} placeholder="0700 000 000" className={field} />
          </Label>
          <Label text="Email">
            <input type="email" value={form.school.email} onChange={setSchool('email')} placeholder="info@school.ac.ke" className={field} />
          </Label>
          <div className="sm:col-span-2">
            <Label text="Line at the bottom of receipts (leave empty for none)">
              <input value={form.school.receiptFooter} onChange={setSchool('receiptFooter')} className={field} />
            </Label>
          </div>
        </div>
      </Card>

      <Card title="How parents can pay">
        <p className="text-xs text-slate-500 mb-4">
          These appear in the parent portal under "How to pay fees". Tick the ones your school accepts.
        </p>

        <div className="space-y-6">
          <div>
            <Toggle checked={!!mpesa.enabled} onChange={setPay('mpesa', 'enabled')}>M-Pesa Paybill</Toggle>
            {mpesa.enabled && (
              <div className="mt-3 max-w-xs">
                <Label text="Paybill (business) number">
                  <input value={mpesa.paybill ?? ''} onChange={setPay('mpesa', 'paybill')} inputMode="numeric" placeholder="e.g. 522522" className={field} />
                </Label>
                <p className="text-xs text-slate-500 mt-1">Parents use the admission number as the account number.</p>
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <Toggle checked={!!bank.enabled} onChange={setPay('bank', 'enabled')}>Bank deposit or transfer</Toggle>
            {bank.enabled && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Label text="Bank"><input value={bank.bankName ?? ''} onChange={setPay('bank', 'bankName')} className={field} /></Label>
                <Label text="Account name"><input value={bank.accountName ?? ''} onChange={setPay('bank', 'accountName')} className={field} /></Label>
                <Label text="Account number"><input value={bank.accountNumber ?? ''} onChange={setPay('bank', 'accountNumber')} className={field} /></Label>
                <Label text="Branch"><input value={bank.branch ?? ''} onChange={setPay('bank', 'branch')} className={field} /></Label>
                <div className="sm:col-span-2">
                  <Label text="Instruction for parents">
                    <input value={bank.note ?? ''} onChange={setPay('bank', 'note')} className={field} />
                  </Label>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <Toggle checked={!!office.enabled} onChange={setPay('office', 'enabled')}>Pay at the school</Toggle>
            {office.enabled && (
              <div className="mt-3">
                <Label text="Details (where and when)">
                  <input value={office.details ?? ''} onChange={setPay('office', 'details')} className={field} />
                </Label>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Online M-Pesa payment (STK push)">
        <p className="text-sm text-slate-600">
          The "Pay with M-Pesa" button uses secret keys that are deliberately <b>not</b> stored here. They live in the
          server's <code>.env</code> file (<code>MPESA_*</code> values) and are set up when the backend is hosted.
          The Paybill number above is only what parents see on screen.
        </p>
      </Card>

      <div className="flex justify-end pb-8">
        <button disabled={busy} className={`${btn} disabled:opacity-60`}>{busy ? 'Saving...' : 'Save settings'}</button>
      </div>
    </form>
  );
}