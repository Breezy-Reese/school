
import { Router } from 'express';
import {
  Student,
  Payment,
  FeeItem,
  Attendance,
} from '../models/school.js';
import ParentLink from '../models/ParentLink.js';
import Release from '../models/Release.js';

import {
  TZ,
  TERMS,
  sum,
  whenOf,
  yearOf,
  thisYear,
  yearMatch,
  termDue,
  broughtForward,
} from '../utils/balances.js';

import {
  parseTermYear,
  buildReportCard,
} from '../utils/results.js';

const r = Router();

// Parents only
r.use((req, res, next) =>
  req.user?.role === 'parent'
    ? next()
    : res.status(403).json({ message: 'Parents only' })
);

const byDate = { paymentDate: 1, createdAt: 1 };

const currentTerm = () => {
  const m = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      month: 'numeric',
    }).format(new Date())
  );

  return m <= 4 ? 'Term 1' : m <= 8 ? 'Term 2' : 'Term 3';
};

const myAdmNos = async (req) =>
  (
    await ParentLink.find({ user: req.user._id }).lean()
  ).map((l) => l.admNo);

// Return a student only if linked to the logged-in parent
async function myChild(req, admNo) {
  if (
    !(await ParentLink.exists({
      user: req.user._id,
      admNo,
    }))
  ) {
    return null;
  }

  return Student.findOne({ admNo })
    .select('admNo name class status');
}

// --------------------------------------------------
// MY CHILDREN
// --------------------------------------------------

r.get('/children', async (req, res) => {
  const students = await Student.find({
    admNo: { $in: await myAdmNos(req) },
  })
    .select('admNo name class status')
    .lean();

  const term = currentTerm();
  const year = thisYear();
  const out = [];

  for (const s of students) {
    const payments = await Payment.find({
      admNo: s.admNo,
      term,
      ...yearMatch(year),
    });

    const termFee = await termDue({
      cls: s.class,
      term,
      year,
      payments,
    });

    const bf = await broughtForward(s.admNo, year, term);
    const due = termFee + bf;
    const paid = sum(payments, 'amount');

    out.push({
      ...s,
      term,
      year,
      due,
      paid,
      balance: due - paid,
    });
  }

  res.json(out);
});

// --------------------------------------------------
// ACADEMIC RECORDS: ATTENDANCE
// --------------------------------------------------

r.get('/academics/attendance/:admNo', async (req, res) => {
  const student = await myChild(req, req.params.admNo);

  if (!student) {
    return res.status(404).json({
      message: 'Student not found',
    });
  }

  const from = String(req.query.from || '');
  const to = String(req.query.to || '');

  const validDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (
    !validDate(from) ||
    !validDate(to) ||
    from > to
  ) {
    return res.status(400).json({
      message: 'Provide a valid attendance date range',
    });
  }

  const attendanceDocs = await Attendance.find({
    class: student.class,
    date: {
      $gte: from,
      $lte: to,
    },
  })
    .sort({ date: 1 })
    .lean();

  // Extract only this child's attendance records
  const days = attendanceDocs
    .map((doc) => {
      const record = doc.records.find(
        (item) => item.admNo === student.admNo
      );

      if (!record) return null;

      return {
        date: doc.date,
        status: record.status,
      };
    })
    .filter(Boolean);

  const present = days.filter(
    (d) => d.status === 'Present'
  ).length;

  const late = days.filter(
    (d) => d.status === 'Late'
  ).length;

  const absent = days.filter(
    (d) => d.status === 'Absent'
  ).length;

  const marked = days.length;
  const attended = present + late;

  const rate = marked
    ? Math.round((attended / marked) * 1000) / 10
    : null;

  res.json({
    student: {
      admNo: student.admNo,
      name: student.name,
      class: student.class,
    },

    summary: {
      present,
      late,
      absent,
      marked,
      rate,
    },

    days,
  });
});

// --------------------------------------------------
// ACADEMIC RECORDS: REPORT CARD
// --------------------------------------------------

r.get('/academics/results/:admNo', async (req, res) => {
  const student = await myChild(req, req.params.admNo);

  if (!student) {
    return res.status(404).json({
      message: 'Student not found',
    });
  }

  const p = parseTermYear(req.query);

  if (!p) {
    return res.status(400).json({
      message: 'Choose a valid term and year',
    });
  }

  // Reuse the existing report-card calculation
  const card = await buildReportCard({
    admNo: student.admNo,
    ...p,
  });

  if (!card) {
    return res.status(404).json({
      message: 'Report card not found',
    });
  }

  // Check release against the class used by the report card
  const release = await Release.findOne({
    class: card.student.class,
    term: p.term,
    year: p.year,
  }).lean();

  // Do not expose marks before publication
  if (!release?.published) {
    return res.json({
      released: false,
      student: {
        admNo: student.admNo,
        name: student.name,
        class: card.student.class,
      },
      term: p.term,
      year: p.year,
    });
  }

  res.json({
    ...card,
    released: true,
  });
});

// --------------------------------------------------
// PAYMENT STATEMENT YEARS
// --------------------------------------------------

r.get('/years', async (req, res) => {
  const rows = await Payment.aggregate([
    {
      $match: {
        admNo: { $in: await myAdmNos(req) },
      },
    },
    {
      $group: {
        _id: {
          $year: {
            date: {
              $ifNull: ['$paymentDate', '$createdAt'],
            },
            timezone: TZ,
          },
        },
      },
    },
  ]);

  const years = new Set([
    ...rows.map((x) => x._id),
    thisYear(),
    thisYear() + 1,
  ]);

  res.json(
    [...years].sort((a, b) => b - a)
  );
});

// --------------------------------------------------
// CHILD PAYMENTS
// --------------------------------------------------

r.get('/payments/:admNo', async (req, res) => {
  const student = await myChild(req, req.params.admNo);

  if (!student) {
    return res.status(404).json({
      message: 'Student not found',
    });
  }

  const filter = {
    admNo: student.admNo,
  };

  if (req.query.year) {
    Object.assign(
      filter,
      yearMatch(Number(req.query.year))
    );
  }

  res.json(
    await Payment.find(filter)
      .sort({
        paymentDate: -1,
        createdAt: -1,
      })
      .select(
        'receipt term amount method ref paymentDate createdAt'
      )
  );
});

// --------------------------------------------------
// CHILD FEE STATEMENT
// --------------------------------------------------

r.get('/statement/:admNo', async (req, res) => {
  const student = await myChild(req, req.params.admNo);

  if (!student) {
    return res.status(404).json({
      message: 'Student not found',
    });
  }

  const term = TERMS.includes(req.query.term)
    ? req.query.term
    : currentTerm();

  const year = Number(req.query.year) || thisYear();

  const payments = await Payment.find({
    admNo: student.admNo,
    term,
    ...yearMatch(year),
  }).sort(byDate);

  const cls =
    year === thisYear()
      ? student.class
      : payments[0]?.class || student.class;

  const termFee = await termDue({
    cls,
    term,
    year,
    payments,
  });

  const bf = await broughtForward(
    student.admNo,
    year,
    term
  );

  const due = termFee + bf;

  const live = await FeeItem.find({
    class: cls,
    term,
  }).sort({ head: 1 });

  const items =
    sum(live, 'amount') === termFee
      ? live
      : [];

  const paid = sum(payments, 'amount');

  res.json({
    student,
    term,
    year,
    class: cls,
    items,
    payments,
    termFee,
    broughtForward: bf,
    due,
    paid,
    balance: due - paid,
  });
});

// --------------------------------------------------
// RECEIPT
// --------------------------------------------------

r.get('/receipt/:receipt', async (req, res) => {
  const payment = await Payment.findOne({
    receipt: req.params.receipt,
  });

  const student = payment
    ? await myChild(req, payment.admNo)
    : null;

  if (!payment || !student) {
    return res.status(404).json({
      message: 'Receipt not found',
    });
  }

  const year = yearOf(whenOf(payment));

  const all = await Payment.find({
    admNo: payment.admNo,
    term: payment.term,
    ...yearMatch(year),
  }).sort(byDate);

  const idx = all.findIndex(
    (p) => p._id.equals(payment._id)
  );

  const paid = sum(
    all.slice(0, idx + 1),
    'amount'
  );

  const termFee =
    payment.termFee ??
    (await termDue({
      cls: payment.class,
      term: payment.term,
      year,
      payments: all,
    }));

  const bf = await broughtForward(
    payment.admNo,
    year,
    payment.term
  );

  const due = termFee + bf;

  res.json({
    payment,
    student,
    year,
    bf,
    due,
    paid,
    balance: due - paid,
  });
});

export default r;
