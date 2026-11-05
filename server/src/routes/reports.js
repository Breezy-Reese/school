import { Router } from 'express';
import { Student, FeeItem, Payment } from '../models/school.js';

const r = Router();
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const TZ = 'Africa/Nairobi';
const thisYear = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(new Date()));

// Students who still owe fees for a term, biggest balance first
r.get('/defaulters', async (req, res) => {
  const term = TERMS.includes(req.query.term) ? req.query.term : 'Term 1';
  const year = Number(req.query.year) || thisYear();
  const cls = req.query.class;

  const students = await Student.find(cls ? { class: cls } : {}).lean();

  const feeRows = await FeeItem.aggregate([
    { $match: { term } },
    { $group: { _id: '$class', due: { $sum: '$amount' } } },
  ]);
  const dueByClass = Object.fromEntries(feeRows.map((x) => [x._id, x.due]));

  const payRows = await Payment.aggregate([
    {
      $match: {
        term,
        $expr: {
          $eq: [{ $year: { date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: TZ } }, year],
        },
      },
    },
    { $group: { _id: '$admNo', paid: { $sum: '$amount' } } },
  ]);
  const paidByAdm = Object.fromEntries(payRows.map((x) => [x._id, x.paid]));

  const rows = students
    .map((s) => {
      const due = dueByClass[s.class] || 0;
      const paid = paidByAdm[s.admNo] || 0;
      return { admNo: s.admNo, name: s.name, class: s.class, due, paid, balance: due - paid };
    })
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  res.json(rows);
});

// Students in a class (or everyone, grouped by class)
r.get('/class-list', async (req, res) => {
  const filter = req.query.class ? { class: req.query.class } : {};
  const students = await Student.find(filter).sort({ class: 1, name: 1 }).lean();
  res.json(students.map((s) => ({ _id: s._id, admNo: s.admNo, name: s.name, class: s.class })));
});

export default r;