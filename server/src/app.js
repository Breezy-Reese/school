import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/index.js';
import reports from './routes/reports.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/reports', reports);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.name === 'ValidationError' ? 400 : err.code === 11000 ? 409 : 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

export default app;