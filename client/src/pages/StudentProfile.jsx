import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, FileText, Wallet } from 'lucide-react';
import { Card, Badge, ErrorMsg, btn, btnGhost, field } from '../components/UI';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;
const statusTone = { Active: 'green', Transferred: 'amber', 'Passed Out': 'slate' };
const DATE_KEYS = ['dob', 'admissionDate'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Must match TEACHER_EDITABLE in server/src/routes/students.js
const TEACHER_FIELDS = ['phone', 'altPhone', 'email', 'fatherName', 'motherName', 'fatherOccupation'];

const SECTIONS = [
  { title: 'Personal details', fields: [
    { key: 'name', label: 'Full name', required: true },
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    { key: 'bloodGroup', label: 'Blood group', type: 'select', options: BLOOD },
    { key: 'nationalId', label: 'National ID / Birth Cert No' },
    { key: 'penNo', label: 'UPI / NEMIS No' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'religion', label: 'Religion', type: 'select', options: ['Christian', 'Muslim', 'Hindu', 'Other'] },
  ]},
  { title: 'Class and admission', fields: [
    { key: 'class', label: 'Class', type: 'class', required: true },
    { key: 'section', label: 'Section', type: 'select', options: ['A', 'B', 'C'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Transferred', 'Passed Out'], required: true },
    { key: 'admissionDate', label: 'Admission date', type: 'date' },
    { key: 'category', label: 'Category', type: 'select', options: ['Day', 'Boarding'] },
    { key: 'medium', label: 'Medium', type: 'select', options: ['English', 'Kiswahili'] },
  ]},
  { title: 'Family', fields: [
    { key: 'fatherName', label: "Father's name" },
    { key: 'motherName', label: "Mother's name" },
    { key: 'fatherOccupation', label: "Father's occupation" },
  ]},
  { title: 'Contact', fields: [
    { key: 'phone', label: 'Mobile no' },
    { key: 'altPhone', label: 'Alternative mobile' },
    { key: 'email', label: 'Email', type: 'email' },
  ]},
  { title: 'Previous school', fields: [
    { key: 'previousSchool', label: 'Previous school' },
    { key: 'lastClass', label: 'Last class studied' },
    { key: 'tcNumber', label: 'Transfer / leaving cert no' },
  ]},
];

const termNow = () => {
  const m = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', month: 'numeric' }).format(new Date()));
  return m <= 4 ? 'Term 1' : m <= 8 ? 'Term 2' : 'Term 3';
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const isAdmin = can(['admin']);
  const isTeacher = user.role === 'teacher';
  const canEdit = isAdmin || isTeacher;
  const showFees = can(['admin', 'accountant']);

  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [fees, setFees] = useState(null);
  const { data: classes } = useFetch('/classes');

  // Teachers only see the fields they are allowed to change
  const editSections = SECTIONS
    .map((sec) => ({ ...sec, fields: sec.fields.filter((f) => !isTeacher || TEACHER_FIELDS.includes(f.key)) }))
    .filter((sec) => sec.fields.length > 0);

  useEffect(() => {
    api.get(`/students/${id}`)
      .then(({ data }) => {
        setS(data);
        setError('');
        if (showFees) {
          api.get(`/payments/summary/${data.admNo}`, { params: { term: termNow() } })
            .then((r) => setFees(r.data))
            .catch(() => {});
        }
      })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the student'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEdit = () => {
    const next = {};
    editSections.forEach((sec) => sec.fields.forEach((f) => {
      const v = s[f.key];
      next[f.key] = DATE_KEYS.includes(f.key) && v ? String(v).slice(0, 10) : v ?? '';
    }));
    setForm(next);
    setMsg('');
    setSaved(false);
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await api.patch(`/students/${id}`, form);
      setS(data);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save the changes');
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/students/${id}`);
      navigate('/students');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not delete the student');
    }
  };

  const show = (f) => {
    const v = s[f.key];
    if (!v) return '-';
    return DATE_KEYS.includes(f.key) ? new Date(v).toLocaleDateString('en-GB') : v;
  };

  const input = (f) => {
    const value = form[f.key] ?? '';
    const set = (e) => setForm({ ...form, [f.key]: e.target.value });
    if (f.type === 'select' || f.type === 'class') {
      const options = f.type === 'class' ? classes.map((c) => c.name) : f.options;
      return (
        <select value={value} onChange={set} required={f.required} className={field}>
          {!f.required && <option value="">-</option>}
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    }
    return <input type={f.type || 'text'} value={value} onChange={set} required={f.required} className={field} />;
  };

  if (error) {
    return (
      <div>
        <Link to="/students" className={`${btnGhost} inline-flex items-center gap-2 mb-4`}><ArrowLeft size={16} /> Back</Link>
        <ErrorMsg>{error}</ErrorMsg>
      </div>
    );
  }
  if (!s) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="max-w-6xl">
      <Link to="/students" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeft size={16} /> All students
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 flex flex-wrap items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
          {initials(s.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{s.name}</h1>
          <p className="text-sm text-slate-500">{s.admNo} • {s.class}{s.section ? ` ${s.section}` : ''}</p>
        </div>
        <Badge tone={statusTone[s.status] || 'slate'}>{s.status}</Badge>
        {canEdit && !editing && (
          <div className="flex gap-2">
            <button onClick={startEdit} className={`${btn} inline-flex items-center gap-2`}>
              <Pencil size={15} /> {isTeacher ? 'Edit contacts' : 'Edit'}
            </button>
            {isAdmin && (
              <button onClick={remove} className="px-3 py-2 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50 inline-flex items-center gap-2">
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      <ErrorMsg>{msg}</ErrorMsg>
      {saved && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">Changes saved.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Details */}
        <div className="lg:col-span-2">
          {editing ? (
            <form onSubmit={save}>
              {isTeacher && (
                <p className="mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  You can update contact and family details. Other details are changed by the administrator.
                </p>
              )}
              {editSections.map((sec) => (
                <Card key={sec.title} title={sec.title}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sec.fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </label>
                        {input(f)}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              <div className="flex gap-3 justify-end pb-6">
                <button type="button" onClick={() => setEditing(false)} className={btnGhost}>Cancel</button>
                <button className={btn}>Save changes</button>
              </div>
            </form>
          ) : (
            SECTIONS.map((sec) => (
              <Card key={sec.title} title={sec.title}>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {sec.fields.map((f) => (
                    <div key={f.key}>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{f.label}</dt>
                      <dd className="text-sm font-medium text-slate-800 break-words">{show(f)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))
          )}
        </div>

        {/* Side panel */}
        <div>
          {showFees && (
            <Card title={`Fees, ${termNow()}`}>
              {fees ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Fees due</span><b>{kes(fees.due)}</b></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Paid</span><b className="text-green-700">{kes(fees.paid)}</b></div>
                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="text-slate-500">{fees.balance < 0 ? 'Overpaid' : 'Balance'}</span>
                    <b className={fees.balance > 0 ? 'text-red-600' : 'text-green-700'}>{kes(Math.abs(fees.balance))}</b>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Loading...</p>
              )}
              <div className="flex flex-col gap-2 mt-4 text-sm">
                <Link to={`/fees/statement/${s.admNo}`} className="inline-flex items-center gap-2 text-blue-600 hover:underline"><FileText size={15} /> Fee statement</Link>
                <Link to="/fees/collection" className="inline-flex items-center gap-2 text-blue-600 hover:underline"><Wallet size={15} /> Record a payment</Link>
              </div>
            </Card>
          )}
          <Card title="Record">
            <p className="text-xs text-slate-500">Added {new Date(s.createdAt).toLocaleDateString('en-GB')}</p>
            {s.enquiryFormNo && <p className="text-xs text-slate-500 mt-1">From enquiry {s.enquiryFormNo}</p>}
            {isAdmin && <p className="text-xs text-slate-400 mt-3">The admission number can't be changed, because payments and parent links depend on it.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}