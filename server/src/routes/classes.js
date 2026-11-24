import { Router } from 'express';
import mongoose from 'mongoose';
import { SchoolClass, Student, FeeItem, Payment, Mark, Attendance } from '../models/school.js';
import { allowRoles } from '../middleware/auth.js';

const r = Router();
const compact = (v) => String(v || '').toLowerCase().replace(/\s+/g, '');

// Everyone on staff can read (other pages need the class list)
r.get('/', async (req, res) => {
  const classes = await SchoolClass.find().sort({ order: 1, name: 1 }).lean();
  const counts = await Student.aggregate([{ $group: { _id: '$class', count: { $sum: 1 } } }]);
  const byClass = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json(classes.map((c) => ({ ...c, students: byClass[c.name] || 0 })));
});

r.post('/', allowRoles('admin'), async (req, res) => {
  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');
  if (!name) return res.status(400).json({ message: 'Enter the class name' });
  if (name.length > 40) return res.status(400).json({ message: 'The class name is too long' });

  const existing = await SchoolClass.find().lean();
  if (existing.some((c) => compact(c.name) === compact(name))) {
    return res.status(409).json({ message: 'That class already exists' });
  }
  const top = existing.reduce((m, c) => Math.max(m, c.order || 0), 0);
  const order = Number.isFinite(Number(req.body.order)) && req.body.order !== '' ? Number(req.body.order) : top + 1;
  res.status(201).json(await SchoolClass.create({ name, order }));
});

// Only the display order can change
r.patch('/:id', allowRoles('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Class not found' });
  const order = Number(req.body.order);
  if (!Number.isFinite(order)) return res.status(400).json({ message: 'Enter a number for the order' });
  const doc = await SchoolClass.findByIdAndUpdate(req.params.id, { order }, { new: true });
  doc ? res.json(doc) : res.status(404).json({ message: 'Class not found' });
});

r.delete('/:id', allowRoles('admin'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Class not found' });
  const doc = await SchoolClass.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Class not found' });

  const used = await Promise.all([
    Student.exists({ class: doc.name }),
    FeeItem.exists({ class: doc.name }),
    Payment.exists({ class: doc.name }),
    Mark.exists({ class: doc.name }),
    Attendance.exists({ class: doc.name }),
  ]);
  if (used.some(Boolean)) {
    return res.status(409).json({ message: 'This class is in use by students, fees, payments, marks or attendance, so it cannot be deleted.' });
  }
  await doc.deleteOne();
  res.json({ ok: true });
});

export default r;