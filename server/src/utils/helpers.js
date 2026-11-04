import { Counter } from '../models/school.js';

export const yy = () => String(new Date().getFullYear()).slice(-2);

// Remove empty-string fields so optional dates/enums don't fail validation
export const clean = (body) =>
  Object.fromEntries(Object.entries(body).filter(([, v]) => v !== '' && v != null));

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Atomic counter: returns base + seq (e.g. 1001, 1002, ...)
export async function nextNumber(key, base = 1000) {
  const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return base + c.seq;
}

// What the next number WILL be, without consuming it
export async function peekNumber(key, base = 1000) {
  const c = await Counter.findById(key);
  return base + (c?.seq ?? 0) + 1;
}