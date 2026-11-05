import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Download } from 'lucide-react';
import { PageHeader, Card, Table, field, btn, btnGhost } from '../components/UI';
import useFetch from '../hooks/useFetch';
import { SCHOOL } from '../config';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

function downloadCsv(name, header, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [tab, setTab] = useState('defaulters');
  const [cls, setCls] = useState('');
  const [term, setTerm] = useState('Term 1');

  const { data: classes } = useFetch('/classes');
  const { data: defaulters } = useFetch('/reports/defaulters', { term, class: cls }, tab === 'defaulters');
  const { data: list } = useFetch('/reports/class-list', { class: cls }, tab === 'classlist');

  const outstanding = defaulters.reduce((s, x) => s + x.balance, 0);
  const title = tab === 'defaulters'
    ? `FEE DEFAULTERS - ${term.toUpperCase()}${cls ? ` - ${cls}` : ''}`
    : `CLASS LIST${cls ? ` - ${cls}` : ' - ALL CLASSES'}`;

  const exportCsv = () => {
    if (tab === 'defaulters') {
      downloadCsv(`defaulters-${term}.csv`, ['Adm No', 'Student', 'Class', 'Fee due', 'Paid', 'Balance'],
        defaulters.map((x) => [x.admNo, x.name, x.class, x.due, x.paid, x.balance]));
    } else {
      downloadCsv('class-list.csv', ['Adm No', 'Name', 'Class'], list.map((s) => [s.admNo, s.name, s.class]));
    }
  };

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} className={tab === id ? btn : btnGhost}>{label}</button>
  );

  return (
    <div className="max-w-6xl">
      <div className="no-print">
        <PageHeader title="Reports" subtitle="Fee defaulters and class lists" />
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            {tabBtn('defaulters', 'Fee defaulters')}
            {tabBtn('classlist', 'Class list')}
            <div className="flex-1" />
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={`${field} !w-44`}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c._id}>{c.name}</option>)}
            </select>
            {tab === 'defaulters' && (
              <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${field} !w-32`}>
                {['Term 1', 'Term 2', 'Term 3'].map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
            <button onClick={exportCsv} className={`${btnGhost} flex items-center gap-2`}><Download size={16} /> CSV</button>
            <button onClick={() => window.print()} className={`${btn} flex items-center gap-2`}><Printer size={16} /> Print</button>
          </div>
        </Card>
      </div>

      <div className="print-area bg-white border border-slate-300 rounded-lg p-6">
        <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">{SCHOOL.name}</h1>
          <p className="mt-2 inline-block border border-slate-800 px-4 py-1 text-sm font-bold tracking-widest">{title}</p>
        </div>

        {tab === 'defaulters' ? (
          <>
            <p className="text-sm mb-3">
              <b>{defaulters.length}</b> student(s) with a balance. Total outstanding: <b>{kes(outstanding)}</b>
            </p>
            <Table
              rows={defaulters}
              empty="No outstanding balances for this selection."
              columns={[
                { label: 'Adm No', key: 'admNo' },
                { label: 'Student', render: (x) => <Link to={`/fees/statement/${x.admNo}`} className="text-blue-600 hover:underline">{x.name}</Link> },
                { label: 'Class', key: 'class' },
                { label: 'Fee due', render: (x) => kes(x.due) },
                { label: 'Paid', render: (x) => kes(x.paid) },
                { label: 'Balance', render: (x) => <b>{kes(x.balance)}</b> },
              ]}
            />
          </>
        ) : (
          <>
            <p className="text-sm mb-3"><b>{list.length}</b> student(s)</p>
            <Table
              rows={list}
              empty="No students found."
              columns={[
                { label: 'Adm No', key: 'admNo' },
                { label: 'Name', key: 'name' },
                { label: 'Class', key: 'class' },
              ]}
            />
          </>
        )}
        <p className="text-xs text-slate-400 mt-4 text-center">Generated on {new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </div>
  );
}