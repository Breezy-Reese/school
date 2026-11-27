import { Router } from 'express';
import Release from '../models/Release.js';
import { allowRoles } from '../middleware/auth.js';
import { parseTermYear, buildReportCard, buildClassResults, buildClassReportCards } from '../utils/results.js';

const r = Router();

r.get('/class', async (req, res) => {
  const cls = String(req.query.class || '').trim();
  const p = parseTermYear(req.query);
  if (!cls || !p) return res.status(400).json({ message: 'Choose a class, term and year' });
  res.json(await buildClassResults({ cls, ...p }));
});
r.get('/class-cards', async (req, res) => {
  const cls = String(req.query.class || '').trim();
  const p = parseTermYear(req.query);
  if (!cls || !p) return res.status(400).json({ message: 'Choose a class, term and year' });
  res.json(await buildClassReportCards({ cls, ...p }));
});

r.get('/report-card/:admNo', async (req, res) => {
  const p = parseTermYear(req.query);
  if (!p) return res.status(400).json({ message: 'Choose a term and year' });
  const card = await buildReportCard({ admNo: req.params.admNo, ...p });
  card ? res.json(card) : res.status(404).json({ message: 'Student not found' });
});

// Are this class's results released to parents?
r.get('/release', async (req, res) => {
  const cls = String(req.query.class || '').trim();
  const p = parseTermYear(req.query);
  if (!cls || !p) return res.status(400).json({ message: 'Choose a class, term and year' });
  const doc = await Release.findOne({ class: cls, ...p });
  res.json({ published: !!doc?.published, by: doc?.publishedBy, at: doc?.publishedAt });
});

// Only admins can release or withdraw results
r.put('/release', allowRoles('admin'), async (req, res) => {
  const cls = String(req.body.class || '').trim();
  const p = parseTermYear(req.body);
  if (!cls || !p) return res.status(400).json({ message: 'Choose a class, term and year' });
  const doc = await Release.findOneAndUpdate(
    { class: cls, ...p },
    { $set: { published: req.body.published === true, publishedBy: req.user.name, publishedAt: new Date() } },
    { upsert: true, new: true },
  );
  res.json({ published: doc.published, by: doc.publishedBy, at: doc.publishedAt });
});

export default r;