import { Router } from 'express';
import { Attendance, Mark, Student } from '../models/school.js';

export const attendanceRoutes = Router();

attendanceRoutes.get('/', async (req, res) => {
  const { class: cls, date } = req.query;
  const doc = await Attendance.findOne({ class: cls, date });
  res.json({ records: doc?.records ?? [] });
});

attendanceRoutes.put('/', async (req, res) => {
  const { class: cls, date, records } = req.body;
  const doc = await Attendance.findOneAndUpdate(
    { class: cls, date },
    { $set: { records } },
    { new: true, upsert: true }
  );
  res.json(doc);
});

// Attendance summary for one class over a date range
attendanceRoutes.get('/report', async (req, res) => {
  const { class: cls, from, to } = req.query;
  if (!cls) return res.status(400).json({ message: 'Choose a class' });
  const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  if ((from && !isDay(from)) || (to && !isDay(to))) {
    return res.status(400).json({ message: 'Enter valid dates' });
  }

  const filter = { class: cls };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  const docs = await Attendance.find(filter).sort({ date: 1 });

  const recordAdm = [...new Set(docs.flatMap((d) => d.records.map((x) => x.admNo)))];
  const students = await Student.find({
    $or: [{ class: cls, status: 'Active' }, { admNo: { $in: recordAdm } }],
  }).select('admNo name').sort({ admNo: 1 }).lean();

  const tally = Object.fromEntries(students.map((s) => [s.admNo, { present: 0, late: 0, absent: 0 }]));
  const daily = docs.map((d) => {
    const day = { date: d.date, present: 0, late: 0, absent: 0 };
    d.records.forEach((x) => {
      const key = String(x.status || '').toLowerCase();
      if (!['present', 'late', 'absent'].includes(key)) return;
      day[key] += 1;
      if (tally[x.admNo]) tally[x.admNo][key] += 1;
    });
    return day;
  });

  res.json({
    class: cls,
    from: from || null,
    to: to || null,
    days: docs.length,
    students: students.map((s) => {
      const t = tally[s.admNo];
      const marked = t.present + t.late + t.absent;
      return {
        admNo: s.admNo,
        name: s.name,
        ...t,
        marked,
        rate: marked ? Math.round(((t.present + t.late) / marked) * 100) : null,
      };
    }),
    daily,
  });
});

export const marksRoutes = Router();

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const EXAMS = ['Opener', 'Mid-Term', 'End-Term'];

marksRoutes.get('/', async (req, res) => {
  const { class: cls, subject, exam, term } = req.query;
  const year = Number(req.query.year);
  if (!cls || !subject || !EXAMS.includes(exam) || !TERMS.includes(term) || !year) {
    return res.status(400).json({ message: 'Choose a class, subject, exam, term and year' });
  }
  res.json(await Mark.find({ class: cls, subject, exam, term, year }));
});

marksRoutes.put('/', async (req, res) => {
  const { class: cls, subject, exam, term, marks } = req.body;
  const year = Number(req.body.year);
  if (!cls || !subject || !EXAMS.includes(exam) || !TERMS.includes(term) || !year || !Array.isArray(marks)) {
    return res.status(400).json({ message: 'Choose a class, subject, exam, term and year' });
  }
  for (const m of marks) {
    if (m.score !== '' && m.score != null && !(Number(m.score) >= 0 && Number(m.score) <= 100)) {
      return res.status(400).json({ message: 'Marks must be between 0 and 100' });
    }
  }
  const ops = marks.map(({ admNo, score }) => {
    const filter = { year, term, exam, subject, admNo };
    return score === '' || score == null
      ? { deleteOne: { filter } }
      : { updateOne: { filter, update: { $set: { class: cls, score: Number(score) } }, upsert: true } };
  });
  if (ops.length) await Mark.bulkWrite(ops);
  res.json({ ok: true });
});