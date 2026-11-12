import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import { Download, Upload, CheckCircle2 } from 'lucide-react';
import { PageHeader, Card, Table, Badge, ErrorMsg, btn, btnGhost } from '../components/UI';
import api from '../api/axios';

const MAX_ROWS = 1500;

// Column headings people might use  ->  the field we store
const ALIASES = {
  admNo: ['admno', 'admissionno', 'admissionnumber', 'adm', 'admission'],
  name: ['name', 'fullname', 'studentname', 'student'],
  class: ['class', 'form', 'grade'],
  section: ['section', 'stream'],
  gender: ['gender', 'sex'],
  dob: ['dob', 'dateofbirth', 'birthdate'],
  status: ['status'],
  admissionDate: ['admissiondate', 'dateadmitted', 'dateofadmission'],
  fatherName: ['fathername', 'fathersname', 'father'],
  motherName: ['mothername', 'mothersname', 'mother'],
  phone: ['phone', 'phoneno', 'phonenumber', 'mobile', 'mobileno', 'parentphone', 'guardianphone', 'contact'],
  altPhone: ['altphone', 'altmobile', 'altmobileno', 'alternativephone', 'alternativemobile'],
  email: ['email', 'emailaddress'],
  nationalId: ['nationalid', 'nationalidbirthcertno', 'birthcert', 'birthcertno', 'birthcertificateno', 'idno'],
  penNo: ['upi', 'nemis', 'upinemisno', 'upino', 'nemisno'],
  previousSchool: ['previousschool', 'lastschool'],
  category: ['category', 'boardingorday', 'dayorboarding'],
};
const norm = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
const LOOKUP = {};
Object.entries(ALIASES).forEach(([field, list]) => list.forEach((a) => { LOOKUP[a] = field; }));

const TEMPLATE_HEADERS = [
  'Admission No', 'Full Name', 'Class', 'Section', 'Gender', 'Date of Birth', 'Status', 'Admission Date',
  "Father's Name", "Mother's Name", 'Phone', 'Alt Phone', 'Email', 'National ID / Birth Cert No',
  'UPI / NEMIS No', 'Previous School', 'Category',
];
const TEMPLATE_SAMPLE = [
  ['', 'Jane Wanjiku Mwangi', 'Form 1', 'A', 'Female', '14/03/2010', 'Active', '06/01/2026', 'Peter Mwangi', 'Mary Mwangi', '0712345678', '', '', '', '', 'Green Hills Primary', 'Day'],
  ['ADM-24-0150', 'John Otieno Odhiambo', 'Form 3', '', 'Male', '02/09/2008', 'Active', '', '', '', '0723456789', '', '', '', '', '', ''],
];

function downloadTemplate() {
  const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: TEMPLATE_SAMPLE });
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, tone }) {
  const tones = {
    slate: 'bg-white border-slate-200',
    green: 'bg-green-50 border-green-200 text-green-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={`border rounded-lg p-3 ${tones[tone]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default function ImportStudents() {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [ignored, setIgnored] = useState([]);
  const [createClasses, setCreateClasses] = useState(false);
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const reset = () => {
    setRows(null); setReport(null); setResult(null); setMsg(''); setIgnored([]); setFileName('');
  };

  // Ask the server to check the file (nothing is saved)
  const check = async (data, create) => {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.post('/import/students', { rows: data, dryRun: true, createClasses: create });
      setReport(res.data);
    } catch (err) {
      setReport(null);
      setMsg(err.response?.data?.message || 'Could not check the file');
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be chosen again after fixing it
    if (!file) return;
    reset();
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
      error: () => setMsg('Could not read that file. Save it as CSV and try again.'),
      complete: (res) => {
        const headers = res.meta?.fields || [];
        const mapped = new Set(headers.map((h) => LOOKUP[norm(h)]).filter(Boolean));
        if (!mapped.has('name') || !mapped.has('class')) {
          setMsg('The file needs at least a "Full Name" column and a "Class" column. Download the template to see the layout.');
          return;
        }
        if (res.data.length === 0) { setMsg('The file has no student rows.'); return; }
        if (res.data.length > MAX_ROWS) {
          setMsg(`The file has ${res.data.length} rows. Import at most ${MAX_ROWS} at a time.`);
          return;
        }

        setIgnored(headers.filter((h) => !LOOKUP[norm(h)]));
        const data = res.data.map((row) => {
          const out = {};
          Object.entries(row).forEach(([h, v]) => {
            const field = LOOKUP[norm(h)];
            if (field && v != null && String(v).trim() !== '') out[field] = String(v).trim();
          });
          return out;
        });
        setRows(data);
        check(data, createClasses);
      },
    });
  };

  const toggleClasses = (checked) => {
    setCreateClasses(checked);
    if (rows) check(rows, checked);
  };

  const doImport = async () => {
    if (!window.confirm(`Import ${report.ok} student(s)? This adds them to the system.`)) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await api.post('/import/students', { rows, dryRun: false, createClasses });
      setResult(res.data);
      setReport(null);
      setRows(null);
    } catch (err) {
      setMsg(err.response?.data?.message || 'The import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader title="Import Students" subtitle="Add many students at once from a CSV file" />
      <ErrorMsg>{msg}</ErrorMsg>

      {/* Finished */}
      {result && (
        <Card>
          <div className="text-center py-4">
            <CheckCircle2 size={44} className="mx-auto text-green-600" />
            <h2 className="text-lg font-semibold mt-3">Imported {result.created} student(s)</h2>
            {result.duplicates > 0 && <p className="text-sm text-slate-500 mt-1">{result.duplicates} duplicate(s) were skipped.</p>}
            {result.errors > 0 && <p className="text-sm text-slate-500">{result.errors} row(s) had problems and were not imported.</p>}
            {result.newClasses?.length > 0 && <p className="text-sm text-slate-500">New classes created: {result.newClasses.join(', ')}. Remember to set their fees under Fee Structure.</p>}
            {result.failed?.length > 0 && (
              <div className="mt-3 text-sm text-red-700">
                {result.failed.map((f) => <p key={f.row}>Row {f.row} ({f.name}): {f.message}</p>)}
              </div>
            )}
            <div className="flex justify-center gap-3 mt-5">
              <Link to="/students" className={btn}>View all students</Link>
              <button onClick={reset} className={btnGhost}>Import another file</button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 1 and 2 */}
      {!result && (
        <Card title="1. Get the template, 2. Choose your file">
          <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1 mb-4">
            <li>Download the template and open it in Excel.</li>
            <li>Fill in one student per row. <b>Full Name</b> and <b>Class</b> are required, everything else is optional.</li>
            <li>Leave <b>Admission No</b> empty to generate numbers automatically, or fill it to keep the school's existing numbers.</li>
            <li>Write dates as <b>DD/MM/YYYY</b>. Save the file as <b>CSV (Comma delimited)</b>, then upload it here.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <button onClick={downloadTemplate} className={`${btnGhost} inline-flex items-center gap-2`}><Download size={16} /> Download template</button>
            <button onClick={() => fileInput.current?.click()} disabled={busy} className={`${btn} inline-flex items-center gap-2 disabled:opacity-60`}>
              <Upload size={16} /> {fileName ? 'Choose a different file' : 'Choose CSV file'}
            </button>
            <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </div>
          {fileName && <p className="text-sm text-slate-500 mt-3">File: <b>{fileName}</b>{rows ? ` (${rows.length} rows)` : ''}</p>}
          {ignored.length > 0 && <p className="text-xs text-amber-700 mt-2">These columns were not recognised and will be ignored: {ignored.join(', ')}</p>}
        </Card>
      )}

      {/* Check results */}
      {busy && !report && !result && rows && <p className="text-sm text-slate-400">Checking the file...</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat label="Rows in file" value={report.total} tone="slate" />
            <Stat label="Ready to import" value={report.ok} tone="green" />
            <Stat label="Duplicates (skipped)" value={report.duplicates} tone="amber" />
            <Stat label="Rows with errors" value={report.errors} tone="red" />
          </div>

          <Card title="Classes">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={createClasses} onChange={(e) => toggleClasses(e.target.checked)} className="w-4 h-4" />
              Create classes that don't exist yet
            </label>
            {report.newClasses.length > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
                These new classes will be created: <b>{report.newClasses.join(', ')}</b>. Check the spelling. A typo here would create a wrong class.
              </p>
            )}
          </Card>

          {report.problems.length > 0 && (
            <Card title={`Rows that need attention (${report.problems.length}${report.errors + report.duplicates > report.problems.length ? '+' : ''})`}>
              <Table
                rows={report.problems}
                columns={[
                  { label: 'Row', key: 'row' },
                  { label: 'Student', key: 'name' },
                  { label: 'Type', render: (p) => <Badge tone={p.type === 'error' ? 'red' : 'amber'}>{p.type === 'error' ? 'Error' : 'Duplicate'}</Badge> },
                  { label: 'Problem', render: (p) => <span className="text-sm">{p.messages.join('. ')}</span> },
                ]}
              />
              <p className="text-xs text-slate-500 mt-6">
                Row numbers match the spreadsheet (row 1 is the heading). Fix the errors in your file and choose it again, or import the ready rows now and fix the rest later.
              </p>
            </Card>
          )}

          <div className="flex gap-3 justify-end pb-8">
            <button onClick={reset} className={btnGhost}>Start over</button>
            <button onClick={doImport} disabled={busy || report.ok === 0} className={`${btn} disabled:opacity-50`}>
              {busy ? 'Working...' : `Import ${report.ok} student${report.ok === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}