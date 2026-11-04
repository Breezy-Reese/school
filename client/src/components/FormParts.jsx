const tones = {
  blue: 'bg-blue-100 text-blue-900',
  green: 'bg-green-100 text-green-900',
  purple: 'bg-purple-100 text-purple-900',
  sky: 'bg-sky-100 text-sky-900',
};

export const inputCls =
  'w-full border border-slate-300 bg-slate-50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400';

export function FormSection({ title, icon: Icon, tone = 'blue', optional, children }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 font-semibold ${tones[tone]}`}>
        {Icon && <Icon size={18} />}
        {title}
        {optional && <span className="text-xs font-normal opacity-70">(optional)</span>}
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </section>
  );
}

export function Field({ label, required, hint, span = 1, icon: Icon, children }) {
  const spans = { 1: '', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4' };
  return (
    <div className={spans[span]}>
      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" />
        )}
        {children(Icon ? 'pl-9' : '')}
      </div>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}