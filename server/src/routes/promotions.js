import { Router } from 'express';
import { Student, Promotion } from '../models/school.js';

const r = Router();
const ALLOWED = ['admin', 'superadmin'];

r.use((req, res, next) =>
  ALLOWED.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Admins only' }));

// Promotion history, newest first
r.get('/log', async (req, res) => {
  res.json(await Promotion.find().sort({ createdAt: -1 }).limit(200));
});

// Promote students to a class, or mark them as Passed Out
r.post('/', async (req, res) => {
  const { admNos, toClass, graduate, year } = req.body;

  if (!Array.isArray(admNos) || admNos.length === 0) {
    return res.status(400).json({ message: 'Select at least one student' });
  }
  if (!graduate && !String(toClass || '').trim()) {
    return res.status(400).json({ message: 'Choose the class to promote to' });
  }

  const students = await Student.find({ admNo: { $in: admNos } });
  if (students.length === 0) return res.status(404).json({ message: 'No students found' });

  const update = graduate ? { status: 'Passed Out' } : { class: toClass };
  await Student.updateMany({ _id: { $in: students.map((s) => s._id) } }, { $set: update });

  await Promotion.insertMany(students.map((s) => ({
    admNo: s.admNo,
    name: s.name,
    fromClass: s.class,
    toClass: graduate ? 'Graduated' : toClass,
    year: Number(year) || new Date().getFullYear(),
    doneBy: req.user.name,
  })));

  res.json({ moved: students.length });
});

export default r;