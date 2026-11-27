import AuditLog from '../models/AuditLog.js';

const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE'];
const MASK = /pass|token|secret|pin|phone|email|authorization/i;

function summarise(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const out = {};
  for (const [key, value] of Object.entries(body).slice(0, 20)) {
    const k = key.replace(/[.$]/g, '_');
    if (MASK.test(key)) out[k] = '***';
    else if (Array.isArray(value)) out[k] = `[${value.length} items]`;
    else if (value && typeof value === 'object') out[k] = '{...}';
    else out[k] = typeof value === 'string' ? value.slice(0, 80) : value;
  }
  return out;
}

export default function audit(req, res, next) {
  if (!WRITE.includes(req.method)) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 && res.statusCode !== 403) return;
    const path = req.originalUrl.split('?')[0].replace(/^\/api/, '');
    AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name,
      role: req.user?.role,
      method: req.method,
      path,
      entity: path.split('/')[1] || '',
      status: res.statusCode,
      summary: summarise(req.body),
      ip: req.ip,
    }).catch((err) => console.error('Audit log failed:', err.message));
  });
  next();
}