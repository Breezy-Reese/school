import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { PageHeader, Card, Table, ErrorMsg, btn, field } from '../components/UI';
import { useSettings } from '../context/SettingsContext';
import api from '../api/axios';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

function Breakdown({ title, rows, labelKey, color }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card title={title}>
      {rows.length === 0 && <p className="text-sm text-slate-400">Nothing recorded.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r[labelKey]}>
            <div className="flex justify-between text-sm mb-1"><span>{r[labelKey]}</span><b>{kes(r.total)}</b></div>
            <div className="h-2 bg-slate-100 rounded-full"><div className={`h-2 rounded-full ${color}`} style={{ width: `${(r.total / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function IncomeExpense() {
  const { school } = useSettings();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setD(null);
    api.get('/finance/summary', { params: { year } })
      .then((r) => { setD(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load the report'));
  }, [year]);

  const max = d ? Math.max(1, ...d.months.flatMap((m) => [m.income, m.expense])) : 1;
  const net = d?.totals.net ?? 0;

  return (
    <div className="max-w-6xl">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold uppercase">{school.name}</h1>
        <p className="text-sm">Income vs Expense, {year}</p>
      </div>

      <div className="no-print">
        <PageHeader
          title="Income vs Expense"
          subtitle="Fee income compared with what the school spent"
          action={
            <div className="flex gap-3">
              <select value={year} onChange={(e) => setYear(e.target.value)} className={`${field} !w-28`}>
                {[0, 1, 2, 3, 4].map((i) => <option key={i}>{thisYear - i}</option>)}
              </select>
              <button onClick={() => window.print()} className={`${btn} inline-flex items-center gap-2`}><Printer size={16} /> Print</button>
            </div>
          }
        />
      </div>

      <ErrorMsg>{error}</ErrorMsg>
      {!d && !error && <p className="text-sm text-slate-400">Loading...</p>}

      {d && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4"><p className="text-xs text-green-700">Income (fees collected)</p><p className="text-2xl font-bold text-green-900">{kes(d.totals.income)}</p></div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-xs text-red-700">Expenses</p><p className="text-2xl font-bold text-red-900">{kes(d.totals.expense)}</p></div>
            <div className={`border rounded-lg p-4 ${net >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-300'}`}>
              <p className="text-xs text-slate-600">{net >= 0 ? 'Surplus' : 'Deficit'}</p>
              <p className={`text-2xl font-bold ${net >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>{kes(Math.abs(net))}</p>
            </div>
          </div>

          <Card title={`Month by month, ${d.year}`}>
            <div className="flex items-end gap-2 h-52">
              {d.months.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="flex items-end gap-1 w-full h-full">
                    <div className="flex-1 bg-green-500 rounded-t" style={{ height: `${(m.income / max) * 100}%`, minHeight: m.income ? 2 : 0 }} title={`Income ${kes(m.income)}`} />
                    <div className="flex-1 bg-red-400 rounded-t" style={{ height: `${(m.expense / max) * 100}%`, minHeight: m.expense ? 2 : 0 }} title={`Expenses ${kes(m.expense)}`} />
                  </div>
                  <span className="text-xs text-slate-500 mt-1">{m.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3"><span className="inline-block w-3 h-3 bg-green-500 rounded-sm align-middle" /> Income &nbsp; <span className="inline-block w-3 h-3 bg-red-400 rounded-sm align-middle" /> Expenses</p>
          </Card>

          <Card title="Monthly figures">
            <Table
              rows={d.months}
              columns={[
                { label: 'Month', key: 'label' },
                { label: 'Income', render: (m) => kes(m.income) },
                { label: 'Expenses', render: (m) => kes(m.expense) },
                { label: 'Net', render: (m) => <span className={m.net < 0 ? 'text-red-600 font-medium' : 'font-medium'}>{m.net < 0 ? '-' : ''}{kes(Math.abs(m.net))}</span> },
              ]}
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Breakdown title="Income by payment method" rows={d.incomeByMethod} labelKey="method" color="bg-green-500" />
            <Breakdown title="Expenses by category" rows={d.expenseByCategory} labelKey="category" color="bg-red-400" />
          </div>
          <p className="text-xs text-slate-400 mt-3">Income counts fee payments by their payment date. Voided expenses are excluded.</p>
        </>
      )}
    </div>
  );
}