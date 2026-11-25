const GRADE_KEY = 'A: 80-100   B: 70-79   C: 60-69   D: 50-59   E: below 50';
const tone = { A: 'text-green-700', B: 'text-green-700', C: 'text-blue-700', D: 'text-amber-600', E: 'text-red-600' };

export default function ReportCardView({ d, school }) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-8 print:border-0 print:p-0">
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{school.name}</h1>
        <p className="text-xs text-slate-600">
          {[school.address, school.phone && `Tel: ${school.phone}`, school.email].filter(Boolean).join(' • ')}
        </p>
        <p className="mt-3 inline-block border border-slate-800 px-4 py-1 text-sm font-bold tracking-widest">
          REPORT CARD - {d.term.toUpperCase()} {d.year}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mb-6">
        <p><span className="text-slate-500 block text-xs">Student</span><span className="font-semibold">{d.student.name}</span></p>
        <p><span className="text-slate-500 block text-xs">Admission No</span><span className="font-semibold">{d.student.admNo}</span></p>
        <p><span className="text-slate-500 block text-xs">Class</span><span className="font-semibold">{d.student.class}</span></p>
      </div>

      {d.subjects.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">No marks have been recorded for this term yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-5">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs uppercase text-slate-500">
                  <th className="py-2">Subject</th>
                  {d.exams.map((e) => <th key={e} className="py-2 text-center">{e}</th>)}
                  <th className="py-2 text-center">Average</th>
                  <th className="py-2 text-center">Grade</th>
                  <th className="py-2">Remark</th>
                </tr>
              </thead>
              <tbody>
                {d.subjects.map((s) => (
                  <tr key={s.subject} className="border-b border-slate-100">
                    <td className="py-1.5 font-medium">{s.subject}</td>
                    {d.exams.map((e) => <td key={e} className="py-1.5 text-center">{s.scores[e] ?? '-'}</td>)}
                    <td className="py-1.5 text-center font-semibold">{s.average}</td>
                    <td className={`py-1.5 text-center font-bold ${tone[s.grade]}`}>{s.grade}</td>
                    <td className="py-1.5 text-slate-600">{s.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm mb-2">
            <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">Total marks</p><p className="font-bold">{d.total}</p></div>
            <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">Mean score</p><p className="font-bold">{d.mean}</p></div>
            <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">Mean grade</p><p className={`font-bold ${tone[d.grade]}`}>{d.grade}</p></div>
            <div className="border border-slate-200 rounded p-2"><p className="text-xs text-slate-500">Position</p><p className="font-bold">{d.position} of {d.outOf}</p></div>
          </div>
          <p className="text-[11px] text-slate-400 mb-6">Average = the mean of the exams taken in that subject. Grades: {GRADE_KEY}</p>
        </>
      )}

      <div className="space-y-5 text-sm mt-6">
        <div><p className="text-xs text-slate-500">Class teacher's comment</p><div className="border-b border-slate-400 h-7" /></div>
        <div><p className="text-xs text-slate-500">Principal's comment</p><div className="border-b border-slate-400 h-7" /></div>
        <div className="flex justify-between pt-3">
          <div className="text-center"><div className="w-44 border-b border-slate-800 mb-1" /><p className="text-xs text-slate-500">Class teacher's signature</p></div>
          <div className="text-center"><div className="w-44 border-b border-slate-800 mb-1" /><p className="text-xs text-slate-500">Principal's signature and stamp</p></div>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-6 text-center">Printed on {new Date().toLocaleDateString('en-GB')}</p>
    </div>
  );
}