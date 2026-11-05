import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/index.js';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Allowed frontends: comma-separated list, e.g. "https://school.vercel.app,http://localhost:5173"
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.set('trust proxy', 1); // Render sits behind a proxy, so rate limiting sees the real IP
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan(isProd ? 'combined' : 'dev'));

// Slow down password guessing: 20 failed logins per 15 minutes per IP
// (successful logins are not counted, so a school sharing one Wi-Fi is fine)
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.name === 'ValidationError' ? 400 : err.code === 11000 ? 409 : 500;
  // In production, don't leak internal error details for unexpected failures
  const message = status === 500 && isProd ? 'Server error' : err.message || 'Server error';
  res.status(status).json({ message });
});

export default app;