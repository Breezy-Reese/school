import { Router } from 'express';
import { Attendance, Mark } from '../models/school.js';

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