import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import settingsRouter from './routes/settings';
import practiceRouter from './routes/practice';
import interviewRouter from './routes/interview';

const app = express();

// ============================================================
// Middleware
// ============================================================

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
}));

// Stricter rate limiter for AI endpoints
const aiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many AI requests. Please wait a moment and try again.' },
  keyGenerator: (req) => req.ip || 'local',
});

// ============================================================
// Routes
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/settings', settingsRouter);
app.use('/api/practice', aiRateLimiter, practiceRouter);
app.use('/api/interview', aiRateLimiter, interviewRouter);

// ============================================================
// Error Handler (must be last)
// ============================================================

app.use(errorHandler);

export default app;
