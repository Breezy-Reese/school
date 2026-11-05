import { Router } from 'express';
import { allowRoles } from '../middleware/auth.js';

const guard = (roles) => (roles ? allowRoles(...roles) : (req, res, next) => next());

export default function crud(Model, { sort = { createdAt: 1 }, beforeCreate, roles = {} } = {}) {
  const r = Router();

  r.get('/', guard(roles.read), async (req, res) => res.json(await Model.find().sort(sort)));

  r.post('/', guard(roles.write), async (req, res) => {
    const body = beforeCreate ? await beforeCreate(req.body) : req.body;
    res.status(201).json(await Model.create(body));
  });

  r.patch('/:id', guard(roles.write), async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    doc ? res.json(doc) : res.status(404).json({ message: 'Not found' });
  });

  r.delete('/:id', guard(roles.write), async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    doc ? res.json({ ok: true }) : res.status(404).json({ message: 'Not found' });
  });

  return r;
}