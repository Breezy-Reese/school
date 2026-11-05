import { FeeItem, Payment, Arrears } from '../models/school.js';

export const TZ = 'Africa/Nairobi';
export const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export const sum = (rows, key) => rows.reduce((s, x) => s + (x[key] || 0), 0);
export const whenOf = (p) => p.paymentDate || p.createdAt;
export const yearOf = (d) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(new Date(d)));
export const thisYear = () => yearOf(new Date());

// Matches payments made in a calendar year
export const yearMatch = (year) => ({
  $expr: { $eq: [{ $year: { date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: TZ } }, year] },
});

// Fee due for a class/term. Current year uses the live fee structure;
// past years prefer the fee that was recorded with the payments.
export async function termDue({ cls, term, year, payments }) {
  const live = sum(await FeeItem.find({ class: cls, term }), 'amount');
  const snap = [...payments]
    .filter((p) => p.termFee != null)
    .sort((a, b) => whenOf(b) - whenOf(a))[0]?.termFee;
  return year === thisYear() ? (live || snap || 0) : (snap ?? live);
}

// Balance brought forward from the previous year (Term 1 only)
export async function broughtForward(admNo, year, term) {
  if (term !== 'Term 1') return 0;
  const doc = await Arrears.findOne({ admNo, year }).lean();
  return doc?.amount || 0;
}

// What a student owes (or is owed) across the whole year: b/f + 3 terms of fees - payments
export async function yearBalance(student, year) {
  const payments = await Payment.find({ admNo: student.admNo, ...yearMatch(year) });
  let due = await broughtForward(student.admNo, year, 'Term 1');
  for (const term of TERMS) {
    const termPayments = payments.filter((p) => p.term === term);
    due += await termDue({ cls: student.class, term, year, payments: termPayments });
  }
  return due - sum(payments, 'amount');
}