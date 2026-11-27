import { Router } from 'express';
import { Student, FeeItem, Payment, Arrears } from '../models/school.js';
import Setting from '../models/Setting.js';
import SmsLog from '../models/SmsLog.js';
import { smsConfigured, toIntl, sendSms } from '../utils/sms.js';

const r = Router();
const TZ = 'Africa/Nairobi';

const thisYear = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric' }).format(new Date()));
const currentTerm = () => {
  const m = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'numeric' }).format(new Date()));
  return m <= 4 ? 'Term 1' : m <= 8 ? 'Term 2' : 'Term 3';
};

// Active students who owe fees this term (same method as the dashboard)
async function owing(cls) {
  const term = currentTerm();
  const year = thisYear();
  const paidThisYear = { $eq: [{ $year: { date: { $ifNull: ['$paymentDate', '$createdAt'] }, timezone: TZ } }, year] };

  const [feeByClass, students, arrears, paidBy] = await Promise.all([
    FeeItem.aggregate([{ $match: { term } }, { $group: { _id: '$class', total: { $sum: '$amount' } } }]),
    Student.find({ status: 'Active', ...(cls ? { class: cls } : {}) }).select('admNo name class phone').lean(),
    term === 'Term 1' ? Arrears.find({ year }).lean() : [],
    Payment.aggregate([{ $match: { term, $expr: paidThisYear } }, { $group: { _id: '$admNo', paid: { $sum: '$amount' } } }]),
  ]);

  const feeOf = Object.fromEntries(feeByClass.map((f) => [f._id, f.total]));
  const bfOf = Object.fromEntries(arrears.map((a) => [a.admNo, a.amount]));
  const paidOf = Object.fromEntries(paidBy.map((p) => [p._id, p.paid]));

  const rows = students
    .map((s) => ({ ...s, balance: (feeOf[s.class] || 0) + (bfOf[s.admNo] || 0) - (paidOf[s.admNo] || 0) }))
    .filter((s) => s.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  return { term, year, rows };
}

const render = (template, vars) => template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

r.get('/status', (req, res) => {
  res.json({ configured: smsConfigured(), sandbox: process.env.AT_ENV === 'sandbox' });
});

// Who could be reminded, with their balance and when they were last texted
r.get('/targets', async (req, res) => {
  const { term, year, rows } = await owing(String(req.query.class || '').trim() || undefined);
  const last = await SmsLog.aggregate([
    { $match: { status: 'sent', admNo: { $in: rows.map((x) => x.admNo) } } },
    { $group: { _id: '$admNo', at: { $max: '$createdAt' } } },
  ]);
  const lastOf = Object.fromEntries(last.map((x) => [x._id, x.at]));
  res.json(rows.map((s) => ({
    admNo: s.admNo, name: s.name, class: s.class, phone: s.phone || '',
    validPhone: !!toIntl(s.phone), balance: s.balance, term, year, lastSent: lastOf[s.admNo] || null,
  })));
});

r.get('/log', async (req, res) => {
  res.json(await SmsLog.find().sort({ createdAt: -1 }).limit(200).lean());
});

// The server works out each balance itself. Nothing from the browser is trusted for amounts.
r.post('/send', async (req, res) => {
  if (!smsConfigured()) return res.status(503).json({ message: 'SMS is not set up on the server yet' });

  const template = String(req.body.template || '').trim();
  if (!template) return res.status(400).json({ message: 'Write the message first' });
  if (template.length > 300) return res.status(400).json({ message: 'The message is too long (300 characters at most)' });
  const admNos = Array.isArray(req.body.admNos) ? [...new Set(req.body.admNos.map(String))].slice(0, 300) : [];
  if (admNos.length === 0) return res.status(400).json({ message: 'Select at least one parent' });
  const force = req.body.force === true;

  const { term, rows } = await owing();
  const byAdm = Object.fromEntries(rows.map((x) => [x.admNo, x]));
  const setting = await Setting.findOne({ key: 'main' }).lean();
  const school = setting?.school?.name || 'the school';
  const paybill = setting?.payment?.mpesa?.enabled ? setting.payment.mpesa.paybill || '' : '';

  const recent = force ? new Set() : new Set(
    (await SmsLog.find({ admNo: { $in: admNos }, status: 'sent', createdAt: { $gt: new Date(Date.now() - 86400000) } })
      .select('admNo').lean()).map((x) => x.admNo),
  );

  const out = { sent: 0, failed: 0, skipped: 0, details: [] };
  const jobs = [];
  for (const admNo of admNos) {
    const s = byAdm[admNo];
    const to = s ? toIntl(s.phone) : null;
    const skip = (reason) => { out.skipped += 1; out.details.push({ admNo, name: s?.name || admNo, outcome: 'skipped', reason }); };
    if (!s) { skip('No balance, or not an active student'); continue; }
    if (!to) { skip('No valid phone number'); continue; }
    if (recent.has(admNo)) { skip('Already texted in the last 24 hours'); continue; }
    const message = render(template, {
      student: s.name, admNo, class: s.class, term, school, paybill,
      balance: Math.round(s.balance).toLocaleString('en-US'),
    });
    jobs.push({ s, to, message });
  }

  for (let i = 0; i < jobs.length; i += 5) {
    await Promise.all(jobs.slice(i, i + 5).map(async ({ s, to, message }) => {
      const result = await sendSms(to, message);
      await SmsLog.create({
        admNo: s.admNo, studentName: s.name, to, message,
        status: result.ok ? 'sent' : 'failed', detail: result.detail, cost: result.cost, sentBy: req.user.name,
      });
      if (result.ok) out.sent += 1; else out.failed += 1;
      out.details.push({ admNo: s.admNo, name: s.name, outcome: result.ok ? 'sent' : 'failed', reason: result.ok ? result.cost : result.detail });
    }));
  }
  res.json(out);
});

export default r;