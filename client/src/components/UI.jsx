import { Search } from 'lucide-react';

export const btn = 'px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700';
export const btnGhost = 'px-4 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50';
export const field = 'w-full border border-slate-300 bg-slate-50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, right, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
      {(title || right) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold">{title}</h3>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Label({ text, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">{text}</label>
      {children}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

const tones = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  slate: 'bg-slate-200 text-slate-600',
};
export const Badge = ({ tone = 'slate', children }) => (
  <span className={`text-xs font-medium rounded-full px-2 py-1 ${tones[tone]}`}>{children}</span>
);

export function Table({ columns, rows, empty = 'No records found.' }) {
  return (
    <div className="overflow-x-auto -m-4">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
          <tr>{columns.map((c) => <th key={c.label} className="px-4 py-2 font-semibold">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.label} className="px-4 py-2">{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export const ErrorMsg = ({ children }) =>
  children ? <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{children}</p> : null;