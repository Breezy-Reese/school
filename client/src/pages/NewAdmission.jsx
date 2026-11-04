import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IdCard, FileText, User, Calendar, Users, Droplet, Hash, Pencil,
  GraduationCap, Phone, Mail, Layers, Flag, Building2, Wallet,
} from 'lucide-react';
import { FormSection, Field, inputCls } from '../components/FormParts';
import { ErrorMsg } from '../components/UI';
import useFetch from '../hooks/useFetch';
import api from '../api/axios';

const initial = {
  admNo: '', enquiryFormNo: '', fullName: '', fatherName: '',
  motherName: '', dob: '', gender: '', bloodGroup: '', nationalId: '', penNo: '',
  class: '', section: '', status: 'Active',
  admissionDate: new Date().toISOString().slice(0, 10),
  category: '', religion: '', nationality: 'Kenyan',
  medium: '', fatherOccupation: '', previousSchool: '', lastClass: '', tcNumber: '',
  mobile: '', altMobile: '', email: '',
};

export default function NewAdmission() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: classList } = useFetch('/classes');

  useEffect(() => {
    api.get('/students/next-number').then((r) => setForm((f) => ({ ...f, admNo: r.data.admNo })));
  }, []);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/students', {
        ...form,
        name: form.fullName,
        phone: form.mobile,
        altPhone: form.altMobile,
      });
      navigate('/students');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save admission');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold">New Admission</h2>
          <p className="text-sm text-slate-500">Register a new student</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 flex items-center gap-1">
            <Calendar size={14} /> 2027-28
          </span>
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="border border-blue-300 text-blue-700 text-sm px-3 py-1.5 rounded-md hover:bg-blue-50"
          >
            ← Back to Students
          </button>
        </div>
      </div>

      <form onSubmit={submit}>
        <FormSection title="Basic Information" icon={IdCard} tone="blue">
          <Field label="Adm No" required icon={IdCard}>{input('admNo', { readOnly: true })}</Field>
          <Field label="Admission Form No" span={2} icon={FileText} hint="Optional, from enquiry">
            {input('enquiryFormNo', { placeholder: 'e.g. FORM-26-1001' })}
          </Field>
          <div className="hidden lg:block" />
          <Field label="Full Name" required span={2} icon={User}>
            {input('fullName', { placeholder: 'Student full name', required: true })}
          </Field>
          <div className="hidden lg:block lg:col-span-2" />
          <Field label="Father's Name" span={2} icon={User}>{input('fatherName', { placeholder: "Father's name" })}</Field>
          <Field label="Mother's Name" span={2} icon={User}>{input('motherName', { placeholder: "Mother's name" })}</Field>
          <Field label="Date of Birth" icon={Calendar}>{input('dob', { type: 'date' })}</Field>
          <Field label="Gender" icon={Users}>{select('gender', ['Male', 'Female', 'Other'])}</Field>
          <Field label="Blood Group" icon={Droplet}>{select('bloodGroup', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])}</Field>
          <Field label="National ID / Birth Cert No" icon={Hash}>{input('nationalId', { placeholder: 'Enter number' })}</Field>
          <Field label="UPI / NEMIS No" icon={Pencil} hint="Optional, can be left blank">
            {input('penNo', { placeholder: 'Unique student number' })}
          </Field>
        </FormSection>

        <FormSection title="Class & Admission" icon={GraduationCap} tone="green">
          <Field label="Class" required span={2} icon={Layers}>{select('class', classList.map((c) => c.name))}</Field>
          <Field label="Section" icon={Layers}>{select('section', ['A', 'B', 'C'])}</Field>
          <Field label="Status" icon={Flag}>{select('status', ['Active', 'Transferred', 'Passed Out'])}</Field>
          <Field label="Admission Date" icon={Calendar}>{input('admissionDate', { type: 'date' })}</Field>
          <Field label="Category" icon={Layers}>{select('category', ['Day', 'Boarding'])}</Field>
          <Field label="Religion" icon={Building2}>{select('religion', ['Christian', 'Muslim', 'Hindu', 'Other'])}</Field>
          <Field label="Nationality" icon={Flag}>{input('nationality')}</Field>
        </FormSection>

        <FormSection title="Other Details" icon={Users} tone="purple" optional>
          <Field label="Medium" icon={Layers}>{select('medium', ['English', 'Kiswahili'])}</Field>
          <Field label="Father's Occupation" icon={Wallet}>{input('fatherOccupation', { placeholder: 'e.g. Farmer, Business' })}</Field>
          <Field label="Previous School" span={2} icon={Building2}>{input('previousSchool', { placeholder: 'Name of last school' })}</Field>
          <Field label="Last Class Studied" icon={GraduationCap}>{input('lastClass', { placeholder: 'e.g. Class 8' })}</Field>
          <Field label="Transfer / Leaving Cert No" icon={FileText}>{input('tcNumber', { placeholder: 'Certificate No.' })}</Field>
        </FormSection>

        <FormSection title="Contact Details" icon={Phone} tone="sky">
          <Field label="Mobile No" icon={Phone}>{input('mobile', { placeholder: '07XX XXX XXX' })}</Field>
          <Field label="Alt Mobile No" icon={Phone}>{input('altMobile', { placeholder: 'Alternative number' })}</Field>
          <Field label="Email" span={2} icon={Mail}>{input('email', { type: 'email', placeholder: 'parent@email.com' })}</Field>
        </FormSection>

        <ErrorMsg>{error}</ErrorMsg>
        <div className="flex gap-3 justify-end pb-6">
          <button
            type="button"
            onClick={() => setForm({ ...initial, admNo: form.admNo })}
            className="px-5 py-2 rounded-md border border-slate-300 hover:bg-slate-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Admission'}
          </button>
        </div>
      </form>
    </div>
  );
}