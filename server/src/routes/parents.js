import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import ParentLink from '../models/ParentLink.js';
import { Student } from '../models/school.js';

const r = Router();

// Accepts an array or a comma/space separated string of admission numbers
const cleanAdm = (v) => [...new Set(
  (Array.isArray(v) ? v : String(v || '').split(/[\s,;]+/)).map((s) => String(s).trim()).filter(Boolean),
)];

async function findParent(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, role: 'parent' });
}

async function withChildren(users) {
  const links = await ParentLink.find({ user: { $in: users.map((u) => u._id) } }).lean();
  const students = await Student.find({ admNo: { $in: links.map((l) => l.admNo) } })
    .select('admNo name class').lean();
  const byAdm = Object.fromEntries(students.map((s) => [s.admNo, s]));
  return users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    active: u.active !== false,
    children: links
      .filter((l) => String(l.user) === String(u._id))
      .map((l) => ({
        admNo: l.admNo,
        name: byAdm[l.admNo]?.name || '(student not found)',
        class: byAdm[l.admNo]?.class || '',
      })),
  }));
}

// All parent accounts with their children
r.get('/', async (req, res) => {
  const users = await User.find({ role: 'parent' }).sort({ createdAt: -1 }).lean();
  res.json(await withChildren(users));
});

// Create a parent account and link it to one or more students
r.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const { password } = req.body;
  const admNos = cleanAdm(req.body.admNos);

  if (!name) return res.status(400).json({ message: 'Enter the parent\'s name' });
  if (!email) return res.status(400).json({ message: 'Enter an email address' });
  if (!password || String(password).length < 8) {
    return res.status(400).json({ message: 'The password must be at least 8 characters' });
  }
  if (admNos.length === 0) return res.status(400).json({ message: 'Link at least one student' });

  const students = await Student.find({ admNo: { $in: admNos } }).select('admNo');
  const missing = admNos.filter((a) => !students.some((s) => s.admNo === a));
  if (missing.length) {
    return res.status(400).json({ message: `Student not found: ${missing.join(', ')}` });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'A user with that email already exists' });
  }

  const user = await User.create({ name, email, password, role: 'parent' });
  await ParentLink.insertMany(admNos.map((admNo) => ({ user: user._id, admNo })));
  res.status(201).json({ _id: user._id });
});

// Link another child to an existing parent
r.post('/:id/children', async (req, res) => {
  const parent = await findParent(req.params.id);
  if (!parent) return res.status(404).json({ message: 'Parent account not found' });
  const admNo = String(req.body.admNo || '').trim();
  if (!(await Student.exists({ admNo }))) return res.status(404).json({ message: 'Student not found' });
  if (!(await ParentLink.exists({ user: parent._id, admNo }))) {
    await ParentLink.create({ user: parent._id, admNo });
  }
  res.json({ ok: true });
});

// Unlink a child
r.delete('/:id/children/:admNo', async (req, res) => {
  const parent = await findParent(req.params.id);
  if (!parent) return res.status(404).json({ message: 'Parent account not found' });
  await ParentLink.deleteOne({ user: parent._id, admNo: req.params.admNo });
  res.json({ ok: true });
});

// Activate/deactivate, or reset the password
r.patch('/:id', async (req, res) => {
  const parent = await findParent(req.params.id);
  if (!parent) return res.status(404).json({ message: 'Parent account not found' });

  if (typeof req.body.active === 'boolean') parent.active = req.body.active;
  if (req.body.password !== undefined) {
    if (String(req.body.password).length < 8) {
      return res.status(400).json({ message: 'The password must be at least 8 characters' });
    }
    parent.password = req.body.password;
  }
  await parent.save();
  res.json({ ok: true });
});

export default r;