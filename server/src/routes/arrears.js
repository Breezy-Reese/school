import { Router } from 'express';
import { Student, Arrears } from '../models/school.js';
import { thisYear } from '../utils/balances.js';

const r = Router();
const ALLOWED = ['admin', 'superadmin', 'accountant'];
const CAN_DELETE = ['admin', 'superadmin'];

r.use((req, res, next) =>
  ALLOWED.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Not allowed' }));

// Balances brought forward into a year
r.get('/', async (req, res) => {
  const year = Number(req.query.year) || thisYear();
  const rows = await Arrears.find({ year }).sort({ updatedAt: -1 }).lean();
  const students = await Student.find({ admNo: { $in: rows.map((x) => x.admNo) } })
    .select('admNo name class')
    .lean();
  const byAdm = Object.fromEntries(students.map((s) => [s.admNo, s]));
  res.json(rows.map((x) => ({
    ...x,
    name: byAdm[x.admNo]?.name || '',
    class: byAdm[x.admNo]?.class || '',
  })));
});

// Set (or replace) a student's brought-forward balance for a year
r.post('/', async (req, res) => {
  const { admNo, year, amount, note } = req.body;

  const student = await Student.findOne({ admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt === 0) {
    return res.status(400).json({ message: 'Enter an amount (use a negative number for a credit)' });
  }

  const yr = Number(year) || thisYear();
  if (yr < 2000 || yr > thisYear() + 1) {
    return res.status(400).json({ message: 'Invalid year' });
  }

  const doc = await Arrears.findOneAndUpdate(
    { admNo, year: yr },
    { amount: amt, note: String(note || '').trim(), doneBy: req.user.name },
    { upsert: true, new: true },
  );
  res.status(201).json(doc);
});

// Remove a brought-forward balance (admins only)
r.delete('/:id', async (req, res) => {
  if (!CAN_DELETE.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Only an admin can remove a balance' });
  }
  const doc = await Arrears.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Balance not found' });
  res.json({ ok: true });
});

export default r;