import { Router } from 'express';
import { Student, FeeItem, Payment } from '../models/school.js';
import { nextNumber, escapeRegex } from '../utils/helpers.js';

const r = Router();
const METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Cheque', 'Card'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const TZ = 'Africa/Nairobi';

const sum = (rows, key) => rows.reduce((s, x) => s + (x[key] || 0), 0);
const whenOf = (p) => p.paymentDate || p.createdAt;
const yearOf = (d) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(new Date(d)));
const thisYear = () => yearOf(new Date());
const byDate = { paymentDate: 1, createdAt: 1 };

// Matches payments made in a calendar year (the school year = calendar year)
const yearMatch = (year) => ({
  $expr: { $eq: [{ $year: { date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: TZ } }, year] },
});

// Fee due for a class/term. Current year uses the live fee structure;
// past years prefer the fee that was recorded with the payments.
async function termDue({ cls, term, year, payments }) {
  const live = sum(await FeeItem.find({ class: cls, term }), 'amount');
  const snap = [...payments]
    .filter((p) => p.termFee != null)
    .sort((a, b) => whenOf(b) - whenOf(a))[0]?.termFee;
  return year === thisYear() ? (live || snap || 0) : (snap ?? live);
}

// List/search payments (newest first)
r.get('/', async (req, res) => {
  const { admNo, year, term, method, q } = req.query;
  const filter = {};
  if (admNo) filter.admNo = admNo;
  if (term) filter.term = term;
  if (method) filter.method = method;
  if (year) Object.assign(filter, yearMatch(Number(year)));
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { receipt: rx }, { admNo: rx }, { ref: rx }];
  }
  res.json(await Payment.find(filter).sort({ paymentDate: -1, createdAt: -1 }).limit(500));
});

// Years that have payments (for the filter dropdowns)
r.get('/years', async (req, res) => {
  const rows = await Payment.aggregate([
    { $group: { _id: { $year: { date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: TZ } } } },
    { $sort: { _id: -1 } },
  ]);
  const years = rows.map((x) => x._id);
  if (!years.includes(thisYear())) years.unshift(thisYear());
  res.json(years);
});

r.get('/summary/:admNo', async (req, res) => {
  const student = await Student.findOne({ admNo: req.params.admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const term = TERMS.includes(req.query.term) ? req.query.term : 'Term 1';
  const year = Number(req.query.year) || thisYear();
  const payments = await Payment.find({ admNo: student.admNo, term, ...yearMatch(year) });
  const cls = year === thisYear() ? student.class : payments[0]?.class || student.class;
  const due = await termDue({ cls, term, year, payments });
  const paid = sum(payments, 'amount');
  res.json({ due, paid, balance: due - paid });
});

// One receipt (balance = right after this payment)
r.get('/receipt/:receipt', async (req, res) => {
  const payment = await Payment.findOne({ receipt: req.params.receipt });
  if (!payment) return res.status(404).json({ message: 'Receipt not found' });
  const student = await Student.findOne({ admNo: payment.admNo });
  const year = yearOf(whenOf(payment));
  const all = await Payment.find({ admNo: payment.admNo, term: payment.term, ...yearMatch(year) }).sort(byDate);
  const idx = all.findIndex((p) => p._id.equals(payment._id));
  const paid = sum(all.slice(0, idx + 1), 'amount');
  const due = payment.termFee ?? (await termDue({ cls: payment.class, term: payment.term, year, payments: all }));
  res.json({ payment, student, year, due, paid, balance: due - paid });
});

// Fee statement for one student, term and year
r.get('/statement/:admNo', async (req, res) => {
  const student = await Student.findOne({ admNo: req.params.admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  const term = TERMS.includes(req.query.term) ? req.query.term : 'Term 1';
  const year = Number(req.query.year) || thisYear();
  const payments = await Payment.find({ admNo: student.admNo, term, ...yearMatch(year) }).sort(byDate);
  const cls = year === thisYear() ? student.class : payments[0]?.class || student.class;
  const due = await termDue({ cls, term, year, payments });
  const live = await FeeItem.find({ class: cls, term }).sort({ head: 1 });
  const items = sum(live, 'amount') === due ? live : []; // only show the breakdown when it matches
  const paid = sum(payments, 'amount');
  res.json({ student, term, year, class: cls, items, payments, due, paid, balance: due - paid });
});

r.post('/', async (req, res) => {
  const { admNo, amount, method, ref, term, paymentDate, className, termFee } = req.body;
  const student = await Student.findOne({ admNo });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (!(Number(amount) > 0)) return res.status(400).json({ message: 'Enter a valid amount' });
  if (!METHODS.includes(method)) return res.status(400).json({ message: 'Choose a valid payment method' });
  if (method !== 'Cash' && !String(ref || '').trim()) {
    return res.status(400).json({ message: `A reference is required for ${method} payments` });
  }
  const termName = term || 'Term 1';
  if (!TERMS.includes(termName)) return res.status(400).json({ message: 'Invalid term' });

  let when = new Date();
  if (paymentDate) {
    when = new Date(`${paymentDate}T12:00:00+03:00`); // noon Kenya time avoids date shifts
    if (Number.isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid payment date' });
    if (when > new Date()) return res.status(400).json({ message: 'Payment date cannot be in the future' });
  }

  const cls = String(className || '').trim() || student.class;
  let snapshot;
  if (termFee !== '' && termFee != null) {
    snapshot = Number(termFee);
    if (!(snapshot >= 0)) return res.status(400).json({ message: 'Invalid term fee' });
  } else {
    snapshot = sum(await FeeItem.find({ class: cls, term: termName }), 'amount');
  }

  const n = await nextNumber('receipt', 0);
  const payment = await Payment.create({
    receipt: `RCT-${String(n).padStart(4, '0')}`,
    admNo, name: student.name, class: cls,
    term: termName,
    paymentDate: when,
    termFee: snapshot > 0 ? snapshot : undefined,
    amount: Number(amount), method, ref: String(ref || '').trim(),
    collectedBy: req.user.name,
  });
  res.status(201).json(payment);
});

export default r;