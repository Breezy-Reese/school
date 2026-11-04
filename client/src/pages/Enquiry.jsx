import { useState } from 'react';
import { ClipboardList, User, Phone, Layers, Calendar, Search, MessageSquare } from 'lucide-react';
import { FormSection, Field, inputCls } from '../components/FormParts';
import { ErrorMsg } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const statusStyle = {
  New: 'bg-blue-100 text-blue-700',
  'Follow Up': 'bg-amber-100 text-amber-700',
  Admitted: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-200 text-slate-600',
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  studentName: '', parentName: '', phone: '', classInterested: '',
  source: '', enquiryDate: today(), notes: '',
});

export default function Enquiry() {
  const [form, setForm] = useState(emptyForm());
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');
  const { data: list, error, reload } = useFetch('/enquiries');
  const { data: classes } = useFetch('/classes');

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enquiries', form);
      setForm(emptyForm());
      setMsg('');
      reload();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save enquiry');
    }
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/enquiries/${id}`, { status });
    reload();
  };

  const q = query.toLowerCase();
  const filtered = list.filter(
    (r) =>
      r.studentName.toLowerCase().includes(q) ||
      (r.parentName || '').toLowerCase().includes(q) ||
      r.formNo.toLowerCase().includes(q) ||
      (r.phone || '').includes(q)
  );

  const input = (name, props = {}) => (pad) => (
    <input name={name} value={form[name]} onChange={set} className={`${inputCls} ${pad}`} {...props} />
  );
  const select = (name, options) => (pad) => (
    <select name={name} value={form[name]} onChange={set} className={`${inputCls} ${pad}`}>
      <option value="">Select</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">Admission Enquiry</h2>
        <p className="text-sm text-slate-500">Record and follow up new enquiries</p>
      </div>
      <ErrorMsg>{error || msg}</ErrorMsg>

      <form onSubmit={submit}>
        <FormSection title="New Enquiry" icon={ClipboardList} tone="blue">
          <Field label="Student Name" required span={2} icon={User}>
            {input('studentName', { placeholder: 'Student full name', required: true })}
          </Field>
          <Field label="Parent / Guardian" span={2} icon={User}>
            {input('parentName', { placeholder: 'Parent or guardian name' })}
          </Field>
          <Field label="Phone" required icon={Phone}>
            {input('phone', { placeholder: '07XX XXX XXX', required: true })}
          </Field>
          <Field label="Class Interested" icon={Layers}>
            {select('classInterested', classes.map((c) => c.name))}
          </Field>
          <Field label="Source" icon={MessageSquare}>
            {select('source', ['Walk-in', 'Referral', 'Social Media', 'Phone Call', 'Other'])}
          </Field>
          <Field label="Enquiry Date" icon={Calendar}>
            {input('enquiryDate', { type: 'date' })}
          </Field>
          <Field label="Notes" span={4}>
            {input('notes', { placeholder: 'Anything worth remembering' })}
          </Field>
        </FormSection>
        <div className="flex justify-end mb-6">
          <button className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700">Save Enquiry</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold">Enquiries ({filtered.length})</h3>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, form no"
              className="border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
              <tr>{['Form No', 'Student', 'Parent', 'Phone', 'Class', 'Date', 'Status'].map((h) => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{r.formNo}</td>
                  <td className="px-4 py-2">{r.studentName}</td>
                  <td className="px-4 py-2">{r.parentName}</td>
                  <td className="px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">{r.classInterested}</td>
                  <td className="px-4 py-2">{r.enquiryDate?.slice(0, 10)}</td>
                  <td className="px-4 py-2">
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r._id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${statusStyle[r.status]}`}
                    >
                      {Object.keys(statusStyle).map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No enquiries found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}