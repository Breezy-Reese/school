import { Router } from 'express';
import {
  Student, Payment, FeeItem, Attendance, Enquiry, Staff, SchoolClass, Arrears,
} from '../models/school.js';
import { TZ, TERMS, thisYear } from '../utils/balances.js';

const r = Router();
const can = (user, roles) => user.role === 'superadmin' || roles.includes(user.role);

const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); // YYYY-MM-DD
const kenyaMonth = (d) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'numeric' }).format(d));

// Kenyan school terms: Jan-Apr, May-Aug, Sep-Dec
const termFor = (d) => (kenyaMonth(d) <= 4 ? 'Term 1' : kenyaMonth(d) <= 8 ? 'Term 2' : 'Term 3');

const payDate = { $ifNull: ['$paymentDate', '$createdAt'] };

r.get('/', async (req, res) => {
  const user = req.user;
  const out = {};
  const now = new Date();
  const today = ymd(now);
  const year = thisYear();
  const term = TERMS.includes(req.query.term) ? req.query.term : termFor(now);
  const yearStart = new Date(`${year}-01-01T00:00:00+03:00`);

  // ---- Students: every role ----
  const [active, newAdmissions, byClass, recent] = await Promise.all([
    Student.countDocuments({ status: 'Active' }),
    Student.countDocuments({ admissionDate: { $gte: yearStart } }),
    Student.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: '$class', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Student.find().sort({ createdAt: -1 }).limit(5).select('admNo name class createdAt'),
  ]);
  out.students = {
    active,
    newAdmissions,
    byClass: byClass.map((c) => ({ class: c._id, count: c.count })),
    recent,
  };
  out.term = term;
  out.year = year;

  // ---- Attendance today: admin + teacher ----
  if (can(user, ['admin', 'teacher'])) {
    const [docs, classes] = await Promise.all([
      Attendance.find({ date: today }),
      SchoolClass.find().sort({ order: 1, name: 1 }).select('name'),
    ]);
    const records = docs.flatMap((d) => d.records);
    const attended = records.filter((x) => x.status !== 'Absent').length; // Present + Late
    const markedClasses = new Set(docs.map((d) => d.class));
    out.attendance = {
      date: today,
      classesMarked: docs.length,
      marked: records.length,
      attended,
      rate: records.length ? Math.round((attended / records.length) * 100) : null,
      unmarkedClasses: classes.map((c) => c.name).filter((n) => !markedClasses.has(n)),
    };
  }

  // ---- Fees: admin + accountant ----
  if (can(user, ['admin', 'accountant'])) {
    const yearExpr = { $eq: [{ $year: { date: payDate, timezone: TZ } }, year] };

    const [feeByClass, activeStudents, arrears, paidByStudent, todayAgg, recentPayments] = await Promise.all([
      FeeItem.aggregate([
        { $match: { term } },
        { $group: { _id: '$class', total: { $sum: '$amount' } } },
      ]),
      Student.find({ status: 'Active' }).select('admNo class').lean(),
      term === 'Term 1' ? Arrears.find({ year }).lean() : [],
      Payment.aggregate([
        { $match: { term, $expr: yearExpr } },
        { $group: { _id: '$admNo', paid: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { $expr: { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: payDate, timezone: TZ } }, today] } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.find().sort({ paymentDate: -1, createdAt: -1 }).limit(5)
        .select('receipt name amount method paymentDate createdAt'),
    ]);

    const feeOf = Object.fromEntries(feeByClass.map((f) => [f._id, f.total]));
    const bfOf = Object.fromEntries(arrears.map((a) => [a.admNo, a.amount]));
    const paidOf = Object.fromEntries(paidByStudent.map((p) => [p._id, p.paid]));

    let expected = 0;
    let defaulters = 0;
    for (const s of activeStudents) {
      const due = (feeOf[s.class] || 0) + (bfOf[s.admNo] || 0);
      expected += due;
      if (due - (paidOf[s.admNo] || 0) > 0) defaulters += 1;
    }
    const collected = paidByStudent.reduce((sum, p) => sum + p.paid, 0);

    // Last 6 months of collections (Nairobi time)
    const baseYear = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(now));
    const baseMonth = kenyaMonth(now) - 1;
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(baseYear, baseMonth - i, 1));
      months.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        amount: 0,
      });
    }
    const since = new Date(`${months[0].key}-01T00:00:00+03:00`);
    const rows = await Payment.aggregate([
      { $match: { $expr: { $gte: [payDate, since] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: payDate, timezone: TZ } }, total: { $sum: '$amount' } } },
    ]);
    rows.forEach((row) => {
      const m = months.find((x) => x.key === row._id);
      if (m) m.amount = row.total;
    });

    out.fees = {
      term,
      expected,
      collected,
      outstanding: Math.max(expected - collected, 0),
      rate: expected ? Math.round((collected / expected) * 100) : null,
      defaulters,
      today: todayAgg[0]?.total || 0,
      todayCount: todayAgg[0]?.count || 0,
      thisMonth: months[months.length - 1].amount,
      monthly: months.map(({ label, amount }) => ({ label, amount })),
      recentPayments,
    };
  }

  // ---- Admin extras ----
  if (can(user, ['admin'])) {
    const [openEnquiries, staff] = await Promise.all([
      Enquiry.countDocuments({ status: { $in: ['New', 'Follow Up'] } }),
      Staff.countDocuments(),
    ]);
    out.admin = { openEnquiries, staff };
  }

  res.json(out);
});

export default r;