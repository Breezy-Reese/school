import { Router } from 'express';
import { Student, FeeItem, Payment } from '../models/school.js';
import { nextNumber } from '../utils/helpers.js';

const r = Router();

r.get('/', async (req, res) => {
  const filter = req.query.admNo ? { admNo: req.query.admNo } : {};
  res.json(await Payment.find(filter).sort({ createdAt: -1 }));
});

// Term fee due, amount paid and balance for one student
r.get('/summary/:admNo', async (req, res) => {
  const student = await Student.findOne({ admNo: req.params.admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const term = req.query.term || 'Term 1';
  const [items, payments] = await Promise.all([
    FeeItem.find({ class: student.class, term }),
    Payment.find({ admNo: student.admNo, term }),
  ]);
  const due = items.reduce((s, i) => s + i.amount, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  res.json({ due, paid, balance: due - paid });
});

r.post('/', async (req, res) => {
  const { admNo, amount, method, ref, term } = req.body;
  const student = await Student.findOne({ admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Enter a valid amount' });

  const n = await nextNumber('receipt', 0);
  const payment = await Payment.create({
    receipt: `RCT-${String(n).padStart(4, '0')}`,
    admNo, name: student.name, class: student.class,
    amount: Number(amount), method, ref, term: term || 'Term 1',
  });
  res.status(201).json(payment);
});

export default r;