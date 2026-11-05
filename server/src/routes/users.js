import { Router } from 'express';
import User, { ROLES } from '../models/User.js';

const r = Router();
const isSuper = (u) => u.role === 'superadmin';
const fail = (res, code, message) => res.status(code).json({ message });
const safe = (u) => { const o = u.toObject(); delete o.password; return o; };
const activeSupers = () => User.countDocuments({ role: 'superadmin', active: { $ne: false } });

r.get('/', async (req, res) => res.json(await User.find().sort({ createdAt: 1 })));

r.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return fail(res, 400, 'Name, email and password are required');
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters');
  if (!ROLES.includes(role)) return fail(res, 400, 'Invalid role');
  if (role === 'superadmin' && !isSuper(req.user)) return fail(res, 403, 'Only a super admin can create a super admin');
  if (await User.findOne({ email: email.toLowerCase().trim() })) return fail(res, 409, 'A user with that email already exists');

  const user = await User.create({ name, email, password, role });
  res.status(201).json(safe(user));
});

r.patch('/:id', async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return fail(res, 404, 'User not found');
  if (isSuper(target) && !isSuper(req.user)) return fail(res, 403, 'Only a super admin can change a super admin');

  const { name, role, active } = req.body;
  if (role !== undefined) {
    if (!ROLES.includes(role)) return fail(res, 400, 'Invalid role');
    if (role === 'superadmin' && !isSuper(req.user)) return fail(res, 403, 'Only a super admin can assign that role');
  }

  const self = target._id.equals(req.user._id);
  const roleChanging = role !== undefined && role !== target.role;
  if (self && (roleChanging || active === false)) {
    return fail(res, 400, "You can't change your own role or deactivate yourself");
  }
  const losingSuper = isSuper(target) && ((role !== undefined && role !== 'superadmin') || active === false);
  if (losingSuper && (await activeSupers()) <= 1) {
    return fail(res, 400, 'There must be at least one active super admin');
  }

  if (name !== undefined) target.name = name;
  if (role !== undefined) target.role = role;
  if (active !== undefined) target.active = active;
  await target.save();
  res.json(safe(target));
});

r.post('/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return fail(res, 400, 'Password must be at least 8 characters');
  const target = await User.findById(req.params.id);
  if (!target) return fail(res, 404, 'User not found');
  if (isSuper(target) && !isSuper(req.user)) return fail(res, 403, 'Only a super admin can reset that password');
  target.password = password;
  await target.save();
  res.json({ ok: true });
});

r.delete('/:id', async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return fail(res, 404, 'User not found');
  if (target._id.equals(req.user._id)) return fail(res, 400, "You can't delete your own account");
  if (isSuper(target) && !isSuper(req.user)) return fail(res, 403, 'Only a super admin can delete a super admin');
  if (isSuper(target) && (await activeSupers()) <= 1) return fail(res, 400, 'There must be at least one active super admin');
  await target.deleteOne();
  res.json({ ok: true });
});

export default r;