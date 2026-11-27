import { Router } from 'express';
import mongoose from 'mongoose';
import { Staff } from '../models/school.js';
import Expense from '../models/Expense.js';
import PayrollRun from '../models/PayrollRun.js';

const r = Router();
const TZ = 'Africa/Nairobi';

const money = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };
const netOf = (e) => (e.basic || 0) + (e.allowances || 0) - (e.deductions || 0);
const monthNow = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
const label = (month) =>
  new Date(`${month}-01T12:00:00+03:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: TZ });
const findRun = async (id) => (mongoose.isValidObjectId(id) ? PayrollRun.findById(id) : null);

const view = (run) => {
  const o = run.toObject();
  const entries = o.entries.map((e) => ({ ...e, net: netOf(e) }));
  const sum = (k) => entries.reduce((s, e) => s + (e[k] || 0), 0);
  return { ...o, entries, totals: { basic: sum('basic'), allowances: sum('allowances'), deductions: sum('deductions'), net: sum('net') } };
};

r.get('/', async (req, res) => {
  const runs = await PayrollRun.find().sort({ month: -1 });
  res.json(runs.map((run) => {
    const v = view(run);
    return { _id: v._id, month: v.month, status: v.status, staff: v.entries.length, totals: v.totals };
  }));
});

// Start a month, filled in from the Staff Management list
r.post('/', async (req, res) => {
  const month = String(req.body.month || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ message: 'Choose a month' });
  if (month > monthNow()) return res.status(400).json({ message: 'You cannot start payroll for a future month' });
  if (await PayrollRun.exists({ month })) return res.status(409).json({ message: 'Payroll for that month already exists' });

  const staff = await Staff.find().sort({ name: 1 }).lean();
  if (staff.length === 0) return res.status(400).json({ message: 'Add staff under Staff Management first' });

  const run = await PayrollRun.create({
    month,
    createdBy: req.user.name,
    entries: staff.map((s) => ({ staff: s._id, name: s.name, role: s.role, basic: s.salary || 0 })),
  });
  res.status(201).json(view(run));
});

r.get('/:id', async (req, res) => {
  const run = await findRun(req.params.id);
  run ? res.json(view(run)) : res.status(404).json({ message: 'Payroll not found' });
});

r.put('/:id/entries', async (req, res) => {
  const run = await findRun(req.params.id);
  if (!run) return res.status(404).json({ message: 'Payroll not found' });
  if (run.status !== 'draft') return res.status(409).json({ message: 'This payroll is finalized and cannot be changed' });

  for (const x of Array.isArray(req.body.entries) ? req.body.entries : []) {
    const e = run.entries.id(x._id);
    if (!e) continue;
    const basic = money(x.basic);
    const allowances = money(x.allowances ?? 0);
    const deductions = money(x.deductions ?? 0);
    if (basic === null || allowances === null || deductions === null) {
      return res.status(400).json({ message: `Enter valid amounts for ${e.name}` });
    }
    if (deductions > basic + allowances) {
      return res.status(400).json({ message: `The deductions for ${e.name} are more than their pay` });
    }
    e.basic = basic;
    e.allowances = allowances;
    e.deductions = deductions;
    e.note = String(x.note ?? '').slice(0, 120);
  }
  await run.save();
  res.json(view(run));
});

// Add staff who were hired after this draft was started
r.post('/:id/sync', async (req, res) => {
  const run = await findRun(req.params.id);
  if (!run) return res.status(404).json({ message: 'Payroll not found' });
  if (run.status !== 'draft') return res.status(409).json({ message: 'This payroll is finalized' });
  const have = new Set(run.entries.map((e) => String(e.staff)));
  const staff = await Staff.find().sort({ name: 1 }).lean();
  staff.filter((s) => !have.has(String(s._id))).forEach((s) =>
    run.entries.push({ staff: s._id, name: s.name, role: s.role, basic: s.salary || 0 }));
  await run.save();
  res.json(view(run));
});

// Lock the run and record the salaries as an expense
r.post('/:id/finalize', async (req, res) => {
  const run = await findRun(req.params.id);
  if (!run) return res.status(404).json({ message: 'Payroll not found' });
  if (run.status !== 'draft') return res.status(409).json({ message: 'This payroll is already finalized' });
  const v = view(run);
  if (!(v.totals.net > 0)) return res.status(400).json({ message: 'The total pay is zero' });

  const expense = await Expense.create({
    date: new Date(),
    category: 'Salaries',
    description: `Salaries for ${label(run.month)}`,
    amount: v.totals.net,
    reference: `PAYROLL-${run.month}`,
    paidTo: `${v.entries.length} staff`,
    recordedBy: req.user.name,
  });
  run.status = 'finalized';
  run.finalizedBy = req.user.name;
  run.finalizedAt = new Date();
  run.expense = expense._id;
  await run.save();
  res.json(view(run));
});

r.delete('/:id', async (req, res) => {
  const run = await findRun(req.params.id);
  if (!run) return res.status(404).json({ message: 'Payroll not found' });
  if (run.status !== 'draft') return res.status(409).json({ message: 'A finalized payroll cannot be deleted' });
  await run.deleteOne();
  res.json({ ok: true });
});

export default r;