import { Router } from 'express';
import { Student, FeeItem, Payment } from '../models/school.js';
import { nextNumber } from '../utils/helpers.js';

const r = Router();
const METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];
const sum = (rows, key) => rows.reduce((s, x) => s + x[key], 0);

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
  const due = sum(items, 'amount');
  const paid = sum(payments, 'amount');
  res.json({ due, paid, balance: due - paid });
});

// Everything needed to print one receipt
r.get('/receipt/:receipt', async (req, res) => {
  const payment = await Payment.findOne({ receipt: req.params.receipt });
  if (!payment) return res.status(404).json({ message: 'Receipt not found' });
  const student = await Student.findOne({ admNo: payment.admNo });
  const [items, upToNow] = await Promise.all([
    FeeItem.find({ class: payment.class, term: payment.term }),
    Payment.find({ admNo: payment.admNo, term: payment.term, createdAt: { $lte: payment.createdAt } }),
  ]);
  const due = sum(items, 'amount');
  const paid = sum(upToNow, 'amount'); // paid up to and including this receipt
  res.json({ payment, student, due, paid, balance: due - paid });
});

// Full fee statement for one student and term
r.get('/statement/:admNo', async (req, res) => {
  const student = await Student.findOne({ admNo: req.params.admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const term = req.query.term || 'Term 1';
  const [items, payments] = await Promise.all([
    FeeItem.find({ class: student.class, term }).sort({ head: 1 }),
    Payment.find({ admNo: student.admNo, term }).sort({ createdAt: 1 }),
  ]);
  const due = sum(items, 'amount');
  const paid = sum(payments, 'amount');
  res.json({ student, term, items, payments, due, paid, balance: due - paid });
});

r.post('/', async (req, res) => {
  const { admNo, amount, method, ref, term } = req.body;
  const student = await Student.findOne({ admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Enter a valid amount' });
  if (!METHODS.includes(method)) return res.status(400).json({ message: 'Choose a valid payment method' });
  if (method !== 'Cash' && !String(ref || '').trim()) {
    return res.status(400).json({ message: `A reference is required for ${method} payments` });
  }

  const n = await nextNumber('receipt', 0);
  const payment = await Payment.create({
    receipt: `RCT-${String(n).padStart(4, '0')}`,
    admNo, name: student.name, class: student.class,
    amount: Number(amount), method, ref: String(ref || '').trim(),
    term: term || 'Term 1',
    collectedBy: req.user.name,
  });
  res.status(201).json(payment);
});

export default r;