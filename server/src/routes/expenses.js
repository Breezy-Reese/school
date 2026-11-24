import { Router } from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import { escapeRegex } from '../utils/helpers.js';

const r = Router();
const TZ = 'Africa/Nairobi';
const CATEGORIES = ['Salaries', 'Utilities', 'Supplies', 'Maintenance', 'Transport', 'Food', 'Learning materials', 'Other'];
const METHODS = ['Cash', 'M-Pesa', 'Bank Transfer', 'Cheque', 'Card'];

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

r.get('/', async (req, res) => {
  const { year, month, category, q } = req.query;
  const and = [];
  if (year) and.push({ $expr: { $eq: [{ $year: { date: '$date', timezone: TZ } }, Number(year)] } });
  if (month) and.push({ $expr: { $eq: [{ $month: { date: '$date', timezone: TZ } }, Number(month)] } });
  if (category) and.push({ category });
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    and.push({ $or: [{ description: rx }, { paidTo: rx }, { reference: rx }] });
  }
  res.json(await Expense.find(and.length ? { $and: and } : {}).sort({ date: -1, createdAt: -1 }).limit(500));
});

r.post('/', async (req, res) => {
  const { date, category, description, amount, method, reference, paidTo } = req.body;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Choose a category' });
  const desc = str(description);
  if (!desc) return res.status(400).json({ message: 'Describe what the money was spent on' });
  const amt = Math.round(Number(amount) * 100) / 100;
  if (!(amt > 0)) return res.status(400).json({ message: 'Enter a valid amount' });
  if (method && !METHODS.includes(method)) return res.status(400).json({ message: 'Choose a valid payment method' });

  const day = str(date) || todayStr();
  const when = new Date(`${day}T12:00:00+03:00`); // noon Kenya time avoids date shifts
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(when.getTime())) {
    return res.status(400).json({ message: 'Enter a valid date' });
  }
  if (day > todayStr()) return res.status(400).json({ message: 'The date cannot be in the future' });

  const doc = await Expense.create({
    date: when, category, description: desc, amount: amt,
    method: method || undefined, reference: str(reference, 80), paidTo: str(paidTo, 120),
    recordedBy: req.user.name,
  });
  res.status(201).json(doc);
});

// Void instead of delete
r.post('/:id/void', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Expense not found' });
  const reason = str(req.body.reason, 200);
  if (reason.length < 3) return res.status(400).json({ message: 'Give a reason for voiding this expense' });
  const doc = await Expense.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Expense not found' });
  if (doc.voided) return res.status(409).json({ message: 'This expense is already voided' });
  doc.voided = true;
  doc.voidReason = reason;
  doc.voidedBy = req.user.name;
  doc.voidedAt = new Date();
  await doc.save();
  res.json(doc);
});

export default r;