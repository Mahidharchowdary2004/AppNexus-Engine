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
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        :root {
          --primary: #3b82f6;
          --secondary: #6366f1;
          --bg: #020617;
        }
        body { 
          font-family: 'Plus Jakarta Sans', sans-serif; 
          background-color: var(--bg);
          background-image: 
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.15) 0px, transparent 50%);
          color: #f8fafc;
          overflow: hidden;
        }
        .glass { 
          background: rgba(15, 23, 42, 0.6); 
          backdrop-filter: blur(20px); 
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .glass:hover {
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .accent-gradient { 
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .floating-blob {
          position: absolute;
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
          filter: blur(80px);
          border-radius: 50%;
          z-index: -1;
          animation: float 20s infinite ease-in-out;
        }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-6 relative">
      <div class="floating-blob" style="top: 10%; left: 10%;"></div>
      <div class="floating-blob" style="bottom: 10%; right: 10%; animation-delay: -5s;"></div>

      <div class="max-w-4xl w-full space-y-10 relative z-10">
        <!-- Header -->
        <div class="text-center space-y-6">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4 glow">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            System Live & Operational
          </div>
          <h1 class="text-6xl font-extrabold tracking-tight text-white leading-tight">
            Nexus <span class="accent-gradient">Engine</span>
          </h1>
          <p class="text-slate-400 text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Architectural JSON Orchestrator & Dynamic Synthesis Layer
          </p>
        </div>

        <!-- Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="glass p-10 rounded-[2.5rem] space-y-8">
            <div class="flex items-center justify-between">
              <h3 class="text-2xl font-bold text-white tracking-tight">Core Vitals</h3>
              <div class="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
            </div>
            <div class="space-y-5 text-base">
              <div class="flex justify-between items-center border-b border-white/5 pb-3">
                <span class="text-slate-400 font-medium">Environment</span>
                <span class="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 uppercase tracking-wider">${status.env}</span>
              </div>
              <div class="flex justify-between items-center border-b border-white/5 pb-3">
                <span class="text-slate-400 font-medium">API Version</span>
                <span class="text-white font-bold">${status.version}</span>
              </div>
              <div class="flex justify-between items-center border-b border-white/5 pb-3">
                <span class="text-slate-400 font-medium">Live Uptime</span>
                <span class="text-white font-bold">${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-slate-400 font-medium">Region</span>
                <span class="text-white font-bold">Global / Edge</span>
              </div>
            </div>
          </div>

          <div class="glass p-10 rounded-[2.5rem] space-y-8">
             <div class="flex items-center justify-between">
              <h3 class="text-2xl font-bold text-white tracking-tight">API Interface</h3>
              <div class="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>
            <div class="space-y-4">
              <div class="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-black px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md tracking-tighter uppercase">Identity</span>
                  <code class="text-xs text-slate-300 font-mono">/api/auth/*</code>
                </div>
              </div>
              <div class="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-black px-2 py-1 bg-purple-500/20 text-purple-400 rounded-md tracking-tighter uppercase">Apps</span>
                  <code class="text-xs text-slate-300 font-mono">/api/apps/*</code>
                </div>
              </div>
              <div class="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-black px-2 py-1 bg-green-500/20 text-green-400 rounded-md tracking-tighter uppercase">Runtime</span>
                  <code class="text-xs text-slate-300 font-mono">/api/data/*</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="text-center pt-10">
          <p class="text-slate-500 text-sm font-medium tracking-wide">
            &copy; 2026 Nexus Engine &bull; Synthesized by <span class="text-blue-500/80">Advanced AI</span>
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
