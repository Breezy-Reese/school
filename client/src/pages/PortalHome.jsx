
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Landmark,
  Banknote,
  Copy,
  Check,
  FileText,
  Receipt,
  ChevronRight,
  CalendarCheck,
  GraduationCap,
} from 'lucide-react';

import { ErrorMsg } from '../components/UI';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { PAYMENT_METHODS } from '../config';

const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

function CopyButton({ text }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="font-semibold text-slate-800">{value}</p>
      </div>

      <CopyButton text={String(value)} />
    </div>
  );
}

function AcademicCard({ to, icon: Icon, title, description, theme }) {
  const styles = {
    blue: {
      card: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50',
      icon: 'bg-blue-100 text-blue-700',
      arrow: 'text-blue-600',
    },
    purple: {
      card: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50/50',
      icon: 'bg-purple-100 text-purple-700',
      arrow: 'text-purple-600',
    },
  };

  const style = styles[theme];

  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${style.card}`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
        <Icon size={25} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <ChevronRight
        size={20}
        className={`shrink-0 transition group-hover:translate-x-1 ${style.arrow}`}
      />
    </Link>
  );
}

function ChildCard({ c }) {
  const due = Number(c.due || 0);
  const paid = Number(c.paid || 0);
  const balance = Number(c.balance || 0);

  const pct =
    due > 0
      ? Math.min(100, Math.round((paid / due) * 100))
      : 0;

  const noFees = due === 0 && paid === 0;
  const owing = balance > 0;

  const status = noFees
    ? {
        text: 'No fees set yet',
        cls: 'bg-slate-100 text-slate-600',
      }
    : owing
      ? {
          text: 'Balance due',
          cls: 'bg-red-100 text-red-700',
        }
      : {
          text: balance < 0 ? 'Overpaid' : 'Fully paid',
          cls: 'bg-green-100 text-green-700',
        };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Child information */}
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            {initials(c.name)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{c.name}</p>
            <p className="text-xs text-slate-500">
              {c.class} • {c.admNo}
            </p>
          </div>

          <span
            className={`text-xs font-semibold rounded-full px-3 py-1 ${status.cls}`}
          >
            {status.text}
          </span>
        </div>

        {/* Fee progress */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>
              {c.term} {c.year}
            </span>
            <span>{noFees ? '' : `${pct}% paid`}</span>
          </div>

          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                owing ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Fee summary */}
        <div className="grid grid-cols-3 gap-3 mt-5 text-center">
          <div>
            <p className="text-[11px] uppercase text-slate-400">
              Fees due
            </p>
            <p className="font-bold">{kes(due)}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase text-slate-400">
              Paid
            </p>
            <p className="font-bold text-green-700">
              {kes(paid)}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase text-slate-400">
              {balance < 0 ? 'Overpaid' : 'Balance'}
            </p>
            <p
              className={`font-bold ${
                owing ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {kes(Math.abs(balance))}
            </p>
          </div>
        </div>
      </div>

      {/* M-Pesa payment */}
      <div className="px-5 pb-4">
        <Link
          to={`/portal/pay/${c.admNo}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 text-white font-semibold py-2.5 hover:bg-green-700 transition"
        >
          <Smartphone size={18} />
          Pay with M-Pesa
        </Link>
      </div>

      {/* Fee statement and receipts */}
      <div className="grid grid-cols-2 border-t border-slate-200 text-sm">
        <Link
          to={`/portal/statement/${c.admNo}`}
          className="flex items-center justify-center gap-2 py-4 px-2 text-blue-700 hover:bg-blue-50 border-r border-slate-200 transition"
        >
          <FileText size={17} />
          <span>Fee statement</span>
          <ChevronRight size={14} />
        </Link>

        <Link
          to={`/portal/payments/${c.admNo}`}
          className="flex items-center justify-center gap-2 py-4 px-2 text-blue-700 hover:bg-blue-50 transition"
        >
          <Receipt size={17} />
          <span>Receipts</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Separate academic cards */}
      <div className="border-t border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          Academic information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AcademicCard
            to={`/portal/attendance/${c.admNo}`}
            icon={CalendarCheck}
            title="Attendance"
            description="View attendance records and summaries"
            theme="blue"
          />

          <AcademicCard
            to={`/portal/results/${c.admNo}`}
            icon={GraduationCap}
            title="Report Cards"
            description="View academic results and performance"
            theme="purple"
          />
        </div>
      </div>
    </div>
  );
}

function HowToPay({ kids }) {
  const icons = {
    mpesa: Smartphone,
    bank: Landmark,
    office: Banknote,
  };

  const tone = {
    mpesa: 'bg-green-100 text-green-700',
    bank: 'bg-blue-100 text-blue-700',
    office: 'bg-amber-100 text-amber-700',
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-1">
        How to pay fees
      </h2>

      <p className="text-sm text-slate-500 mb-4">
        Pay using any option below. Payments made with the{' '}
        <b>Pay with M-Pesa</b> button are recorded automatically.
        For other options, the school office records your payment
        and the receipt appears under Receipts. Keep your payment
        confirmation until then.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAYMENT_METHODS.map((m) => {
          const Icon = icons[m.type] || Banknote;

          return (
            <div
              key={m.id}
              className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${
                m.type === 'mpesa' ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    tone[m.type] || tone.office
                  }`}
                >
                  <Icon size={20} />
                </div>

                <h3 className="font-semibold">{m.title}</h3>
              </div>

              {/* M-Pesa */}
              {m.type === 'mpesa' && (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {kids.map((c) => (
                      <Link
                        key={c.admNo}
                        to={`/portal/pay/${c.admNo}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white text-sm font-semibold px-4 py-2 hover:bg-green-700"
                      >
                        <Smartphone size={16} />
                        Pay for {c.name.split(' ')[0]} now
                      </Link>
                    ))}
                  </div>

                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                    Or pay from your phone menu
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <div>
                      <Detail
                        label="Business number (Paybill)"
                        value={m.paybill}
                      />

                      {kids.map((c) => (
                        <Detail
                          key={c.admNo}
                          label={`Account number for ${c.name.split(' ')[0]}`}
                          value={c.admNo}
                        />
                      ))}
                    </div>

                    <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1 mt-3 sm:mt-0">
                      {m.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </>
              )}

              {/* Bank transfer */}
              {m.type === 'bank' && (
                <>
                  <Detail label="Bank" value={m.bankName} />
                  <Detail label="Account name" value={m.accountName} />
                  <Detail label="Account number" value={m.accountNumber} />
                  <Detail label="Branch" value={m.branch} />

                  <p className="text-sm text-slate-600 mt-3">
                    {m.note}
                  </p>
                </>
              )}

              {/* School office */}
              {m.type === 'office' && (
                <p className="text-sm text-slate-600">
                  {m.details}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function PortalHome() {
  const { user } = useAuth();

  const {
    data: kids,
    loading,
    error,
  } = useFetch('/portal/children');

  const children = Array.isArray(kids) ? kids : [];

  const totalBalance = children.reduce(
    (s, c) => s + Math.max(Number(c.balance || 0), 0),
    0
  );

  const termLabel = children[0]
    ? `${children[0].term}, ${children[0].year}`
    : '';

  return (
    <div>
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 sm:p-8 shadow-sm">
        <p className="text-blue-100 text-sm">
          Parent portal {termLabel && `• ${termLabel}`}
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
          Welcome, {user?.name || 'Parent'}
        </h1>

        {children.length > 0 && (
          <div className="mt-5 inline-block bg-white/15 backdrop-blur rounded-xl px-5 py-3">
            <p className="text-xs text-blue-100 uppercase tracking-wide">
              {totalBalance > 0
                ? 'Total balance across your children'
                : 'All fees are up to date'}
            </p>

            <p className="text-2xl font-bold">
              {kes(totalBalance)}
            </p>
          </div>
        )}
      </div>

      {/* Children */}
      <div className="mt-6">
        <ErrorMsg>{error}</ErrorMsg>

        {loading && (
          <p className="text-sm text-slate-400">
            Loading your children...
          </p>
        )}

        {!loading && !error && children.length === 0 && (
          <p className="text-sm text-slate-500">
            No students are linked to your account yet.
            Please contact the school office.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {children.map((c) => (
            <ChildCard key={c.admNo} c={c} />
          ))}
        </div>

        {children.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            Fees due include any balance brought forward
            from earlier terms.
          </p>
        )}
      </div>

      {/* Payment instructions */}
      {children.length > 0 && (
        <HowToPay kids={children} />
      )}
    </div>
  );
}
