import { Router } from 'express';
import { Student, Attendance, Mark } from '../models/school.js';
import ParentLink from '../models/ParentLink.js';
import Release from '../models/Release.js';
import { TERMS, parseTermYear, buildReportCard } from '../utils/results.js';

const r = Router();
const TZ = 'Africa/Nairobi';

// Parents only
r.use((req, res, next) =>
  req.user?.role === 'parent' ? next() : res.status(403).json({ message: 'Parents only' }));

const dayStr = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

// The student, but only if linked to this parent
async function myChild(req, admNo) {
  if (!(await ParentLink.exists({ user: req.user._id, admNo }))) return null;
  return Student.findOne({ admNo }).select('admNo name class');
}

async function attendanceSummary(admNo, from, to) {
  const docs = await Attendance.find({ date: { $gte: from, $lte: to }, 'records.admNo': admNo }).lean();
  const statuses = docs
    .map((d) => d.records.find((x) => x.admNo === admNo)?.status)
    .filter((s) => ['Present', 'Late', 'Absent'].includes(s));
  const count = (s) => statuses.filter((x) => x === s).length;
  const present = count('Present');
  const late = count('Late');
  const absent = count('Absent');
  const marked = statuses.length;
  return { present, late, absent, marked, rate: marked ? Math.round(((present + late) / marked) * 100) : null };
}

// The most recent term whose results the school has released for this student
async function latestResults(student) {
  const groups = await Mark.aggregate([
    { $match: { admNo: student.admNo, term: { $in: TERMS } } },
    { $group: { _id: { year: '$year', term: '$term' }, class: { $first: '$class' } } },
  ]);
  groups.sort((a, b) => b._id.year - a._id.year || TERMS.indexOf(b._id.term) - TERMS.indexOf(a._id.term));

  for (const g of groups) {
    const released = await Release.exists({ class: g.class, term: g._id.term, year: g._id.year, published: true });
    if (!released) continue;
    const card = await buildReportCard({ admNo: student.admNo, term: g._id.term, year: g._id.year });
    return {
      term: g._id.term,
      year: g._id.year,
      mean: card.mean,
      grade: card.grade,
      position: card.position,
      outOf: card.outOf,
      subjects: card.subjects.map((s) => ({ subject: s.subject, average: s.average, grade: s.grade })),
    };
  }
  return null;
}

// One summary per child, for the two panels on the portal home page
r.get('/overview', async (req, res) => {
  const links = await ParentLink.find({ user: req.user._id }).lean();
  const students = await Student.find({ admNo: { $in: links.map((l) => l.admNo) } })
    .select('admNo name class').sort({ name: 1 }).lean();

  const to = dayStr(new Date());
  const from = dayStr(new Date(Date.now() - 30 * 86400000));

  const out = await Promise.all(students.map(async (s) => ({
    admNo: s.admNo,
    name: s.name,
    class: s.class,
    attendance: { from, to, ...(await attendanceSummary(s.admNo, from, to)) },
    results: await latestResults(s),
  })));
  res.json(out);
});

// Attendance for one of my children, day by day
r.get('/attendance/:admNo', async (req, res) => {
  const student = await myChild(req, req.params.admNo);
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const to = isDay(req.query.to) ? req.query.to : dayStr(new Date());
  const from = isDay(req.query.from) ? req.query.from : dayStr(new Date(Date.now() - 30 * 86400000));

  const docs = await Attendance.find({ date: { $gte: from, $lte: to }, 'records.admNo': student.admNo })
    .sort({ date: -1 }).lean();
  const days = docs
    .map((d) => ({ date: d.date, status: d.records.find((x) => x.admNo === student.admNo)?.status }))
    .filter((x) => ['Present', 'Late', 'Absent'].includes(x.status));

  const count = (s) => days.filter((x) => x.status === s).length;
  const present = count('Present');
  const late = count('Late');
  const absent = count('Absent');
  const marked = days.length;
  res.json({
    student: { admNo: student.admNo, name: student.name, class: student.class },
    from, to, days,
    summary: { present, late, absent, marked, rate: marked ? Math.round(((present + late) / marked) * 100) : null },
  });
});

// Report card, only once the school has released that class's results
r.get('/results/:admNo', async (req, res) => {
  const student = await myChild(req, req.params.admNo);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const p = parseTermYear(req.query);
  if (!p) return res.status(400).json({ message: 'Choose a term and year' });

  const card = await buildReportCard({ admNo: student.admNo, ...p });
  const released = await Release.exists({ class: card.student.class, ...p, published: true });
  if (!released) return res.json({ released: false, ...p, student: card.student });
  res.json({ released: true, ...card });
});

export default r;