import { Router } from 'express';
import { Student, Payment, FeeItem, Attendance, Enquiry, Staff } from '../models/school.js';

const r = Router();
const can = (user, roles) => user.role === 'superadmin' || roles.includes(user.role);
const TERM = 'Term 1';

r.get('/', async (req, res) => {
  const user = req.user;
  const out = {};
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  // ---- Students: every role ----
  const [active, newAdmissions, byClass, recent] = await Promise.all([
    Student.countDocuments({ status: 'Active' }),
    Student.countDocuments({ createdAt: { $gte: yearStart } }),
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

  // ---- Attendance today: admin + teacher ----
  if (can(user, ['admin', 'teacher'])) {
    const docs = await Attendance.find({ date: today });
    const records = docs.flatMap((d) => d.records);
    const attended = records.filter((x) => x.status !== 'Absent').length; // Present + Late
    out.attendance = {
      date: today,
      classesMarked: docs.length,
      marked: records.length,
      attended,
      rate: records.length ? Math.round((attended / records.length) * 100) : null,
    };
  }

  // ---- Fees: admin + accountant ----
  if (can(user, ['admin', 'accountant'])) {
    const [feeByClass, studentsByClass, paidAgg, recentPayments] = await Promise.all([
      FeeItem.aggregate([
        { $match: { term: TERM } },
        { $group: { _id: '$class', total: { $sum: '$amount' } } },
      ]),
      Student.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: '$class', count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { term: TERM } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.find().sort({ createdAt: -1 }).limit(5).select('receipt name amount method createdAt'),
    ]);

    const feeOf = Object.fromEntries(feeByClass.map((f) => [f._id, f.total]));
    const expected = studentsByClass.reduce((sum, c) => sum + c.count * (feeOf[c._id] || 0), 0);
    const collected = paidAgg[0]?.total || 0;

    // Last 6 months of collections
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        amount: 0,
      });
    }
    const since = new Date(`${months[0].key}-01T00:00:00Z`);
    const rows = await Payment.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' } } },
    ]);
    rows.forEach((row) => {
      const m = months.find((x) => x.key === row._id);
      if (m) m.amount = row.total;
    });

    out.fees = {
      term: TERM,
      expected,
      collected,
      outstanding: Math.max(expected - collected, 0),
      rate: expected ? Math.round((collected / expected) * 100) : null,
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