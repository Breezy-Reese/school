import { Router } from 'express';
import { Payment } from '../models/school.js';
import Expense from '../models/Expense.js';

const r = Router();
const TZ = 'Africa/Nairobi';
const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const thisYear = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(new Date()));

// Income = fee payments. Expenses = recorded expenses that are not voided.
r.get('/summary', async (req, res) => {
  const year = Number(req.query.year) || thisYear();
  const payDate = { $ifNull: ['$paymentDate', '$createdAt'] };
  const inYear = (field) => ({ $expr: { $eq: [{ $year: { date: field, timezone: TZ } }, year] } });
  const month = (field) => ({ $month: { date: field, timezone: TZ } });

  const [inc, incByMethod, exp, expByCat] = await Promise.all([
    Payment.aggregate([
      { $match: inYear(payDate) },
      { $group: { _id: month(payDate), total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: inYear(payDate) },
      { $group: { _id: '$method', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { voided: { $ne: true }, ...inYear('$date') } },
      { $group: { _id: month('$date'), total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { voided: { $ne: true }, ...inYear('$date') } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const incomeOf = Object.fromEntries(inc.map((x) => [x._id, x.total]));
  const expenseOf = Object.fromEntries(exp.map((x) => [x._id, x.total]));
  const months = LABELS.map((label, i) => {
    const income = incomeOf[i + 1] || 0;
    const expense = expenseOf[i + 1] || 0;
    return { month: i + 1, label, income, expense, net: income - expense };
  });
  const income = months.reduce((s, m) => s + m.income, 0);
  const expense = months.reduce((s, m) => s + m.expense, 0);

  res.json({
    year,
    months,
    totals: { income, expense, net: income - expense },
    expenseByCategory: expByCat.map((x) => ({ category: x._id, total: x.total })),
    incomeByMethod: incByMethod.map((x) => ({ method: x._id || 'Not recorded', total: x.total })),
  });
});

export default r;