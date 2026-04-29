// backend/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { appsRouter } from './routes/apps';
import { dynamicRouter } from './routes/dynamic';
import { csvRouter } from './routes/csv';
import { adminRouter } from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet());
const allowedOrigins = [
  ...(process.env.FRONTEND_URL?.split(',') || []),
  'http://localhost:3000',
  'https://app-nexus-engine-frontend.vercel.app'
].filter(Boolean).map(o => o.trim()) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === origin) return true;
      // Handle potential trailing slashes
      if (allowedOrigin.replace(/\/$/, '') === origin.replace(/\/$/, '')) return true;
      return false;
    });

    if (isAllowed || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/apps', appsRouter);
app.use('/api/apps/:appSlug/data', dynamicRouter);
app.use('/api/apps/:appSlug/csv', csvRouter);
app.use('/api/admin', adminRouter);

// Root route - Service Dashboard
app.get('/', (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  };

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nexus Engine API | Service Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0f172a; color: #f8fafc; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .accent-gradient { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .badge { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.2); }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-6">
      <div class="max-w-3xl w-full space-y-8">
        <!-- Header -->
        <div class="text-center space-y-4">
          <div class="inline-block px-4 py-1.5 rounded-full badge text-xs font-bold tracking-widest uppercase mb-4">System Online</div>
          <h1 class="text-5xl font-extrabold tracking-tight text-white leading-tight">
            Nexus Engine <span class="text-blue-500">API</span>
          </h1>
          <p class="text-slate-400 text-lg max-w-xl mx-auto">
            The core intelligence powering dynamic application synthesis and metadata-driven orchestration.
          </p>
        </div>

        <!-- Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass p-8 rounded-3xl space-y-6">
            <h3 class="text-xl font-bold flex items-center gap-3">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Service Status
            </h3>
            <div class="space-y-4 text-sm">
              <div class="flex justify-between border-b border-white/5 pb-2">
                <span class="text-slate-400">Environment</span>
                <span class="font-semibold text-blue-400 uppercase">${status.env}</span>
              </div>
              <div class="flex justify-between border-b border-white/5 pb-2">
                <span class="text-slate-400">API Version</span>
                <span class="font-semibold text-white">${status.version}</span>
              </div>
              <div class="flex justify-between border-b border-white/5 pb-2">
                <span class="text-slate-400">Uptime</span>
                <span class="font-semibold text-white">${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Database</span>
                <span class="font-semibold text-green-400">Connected</span>
              </div>
            </div>
          </div>

          <div class="glass p-8 rounded-3xl space-y-6">
            <h3 class="text-xl font-bold">API Endpoints</h3>
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <span class="text-xs font-bold px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg">AUTH</span>
                <code class="text-xs text-slate-300">/api/auth/*</code>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <span class="text-xs font-bold px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg">APPS</span>
                <code class="text-xs text-slate-300">/api/apps/*</code>
              </div>
              <div class="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <span class="text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded-lg">DATA</span>
                <code class="text-xs text-slate-300">/api/apps/:slug/data/*</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center pt-8 border-t border-white/5">
          <p class="text-slate-500 text-sm">
            &copy; 2026 Nexus Engine. Build anything instantly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ ConfigApp backend running on port ${PORT}`);
});

export default app;
