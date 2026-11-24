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

marksRoutes.get('/', async (req, res) => {
  const { class: cls, subject, exam } = req.query;
  res.json(await Mark.find({ class: cls, subject, exam }));
});

marksRoutes.put('/', async (req, res) => {
  const { class: cls, subject, exam, marks } = req.body;
  const ops = marks.map(({ admNo, score }) => {
    const filter = { exam, subject, admNo };
    return score === '' || score == null
      ? { deleteOne: { filter } }
      : { updateOne: { filter, update: { $set: { class: cls, score: Number(score) } }, upsert: true } };
  });
  if (ops.length) await Mark.bulkWrite(ops);
  res.json({ ok: true });
});