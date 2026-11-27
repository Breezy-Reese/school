import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import { escapeRegex } from '../utils/helpers.js';

const r = Router();
const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

r.get('/', async (req, res) => {
  const { q, entity, outcome, from, to } = req.query;
  const filter = {};
  if (entity) filter.entity = String(entity);
  if (outcome === 'denied') filter.status = 403;
  if (outcome === 'ok') filter.status = { $lt: 400 };
  if (q) filter.userName = new RegExp(escapeRegex(String(q)), 'i');
  if (isDay(from) || isDay(to)) {
    filter.createdAt = {};
    if (isDay(from)) filter.createdAt.$gte = new Date(`${from}T00:00:00+03:00`);
    if (isDay(to)) filter.createdAt.$lte = new Date(`${to}T23:59:59+03:00`);
  }
  res.json(await AuditLog.find(filter).sort({ createdAt: -1 }).limit(300).lean());
});

export default r;