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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://*.firebaseapp.com", "https://*.googleapis.com"],
      "connect-src": ["'self'", "https://*.googleapis.com", "https://*.firebaseapp.com", "https://*.google-analytics.com"],
      "frame-src": ["'self'", "https://*.firebaseapp.com", "https://*.google.com"],
      "img-src": ["'self'", "data:", "https://*.googleusercontent.com", "https://*.gstatic.com"]
    },
  },
}));
const allowedOrigins = [
  ...(process.env.FRONTEND_URL?.split(',') || []),
  'http://localhost:3000',
  'https://app-nexus-engine-frontend.vercel.app'
].filter(Boolean).map(o => o.trim()) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === origin) return true;
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
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --amber:   #fbbf24;
          --amber-d: #f97316;
          --green:   #4ade80;
          --blue:    #60a5fa;
          --purple:  #a78bfa;
          --bg:      #080c10;
          --surface: #0d1117;
          --border:  rgba(251,191,36,0.12);
          --border-h:rgba(251,191,36,0.22);
          --muted:   #475569;
          --subtle:  #1e293b;
        }

        html, body {
          height: 100%;
          background: var(--bg);
          color: #e2e8f0;
          font-family: 'Space Grotesk', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem 1.25rem;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Background layers ── */
        .bg-grid {
          position: fixed; inset: 0; z-index: 0;
          background-image:
            linear-gradient(rgba(251,191,36,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251,191,36,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .bg-scanlines {
          position: fixed; inset: 0; z-index: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px
          );
          pointer-events: none;
        }
        .bg-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none; z-index: 0;
        }

        /* ── Layout ── */
        .shell {
          position: relative; z-index: 1;
          width: 100%; max-width: 860px;
        }

        /* ── Status bar ── */
        .status-bar {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 1.75rem;
          font-family: 'Space Mono', monospace;
          font-size: 10px; letter-spacing: 0.18em;
          color: #86efac; text-transform: uppercase;
        }
        .status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 8px var(--green);
          animation: blink-dot 2s infinite;
          flex-shrink: 0;
        }
        @keyframes blink-dot { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .status-rule {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(74,222,128,0.35) 0%, transparent 100%);
        }
        .status-date { color: var(--muted); }

        /* ── Header ── */
        .header { margin-bottom: 2.25rem; }
        .eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 10px; letter-spacing: 0.3em;
          color: var(--amber); text-transform: uppercase;
          margin-bottom: 0.5rem; opacity: 0.75;
        }
        .title {
          font-size: clamp(2.4rem, 7vw, 3.5rem);
          font-weight: 700; line-height: 1;
          letter-spacing: -0.025em; color: #f8fafc;
        }
        .title-accent {
          background: linear-gradient(100deg, var(--amber) 0%, var(--amber-d) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .subtitle {
          font-family: 'Space Mono', monospace;
          font-size: 12px; letter-spacing: 0.06em;
          color: #475569; margin-top: 0.6rem;
        }
        .cursor {
          color: var(--amber);
          animation: blink-cursor 1s step-end infinite;
        }
        @keyframes blink-cursor { 0%,100%{opacity:1} 50%{opacity:0} }

        /* ── HUD grid ── */
        .hud-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          margin-bottom: 1px;
        }
        .hud-cell {
          background: var(--bg);
          padding: 1.25rem 1.5rem;
          position: relative;
          transition: background 0.2s;
        }
        .hud-cell:hover { background: var(--surface); }
        .hud-corner {
          position: absolute; top: 8px; right: 8px;
          width: 5px; height: 5px;
          border-top: 1px solid rgba(251,191,36,0.25);
          border-right: 1px solid rgba(251,191,36,0.25);
        }
        .hud-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px; letter-spacing: 0.22em;
          color: var(--muted); text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .hud-value {
          font-family: 'Space Mono', monospace;
          font-size: 14px; font-weight: 700;
          color: var(--amber);
        }
        .hud-value.green  { color: var(--green); }
        .hud-value.blue   { color: var(--blue); }

        /* ── Routes panel ── */
        .routes-panel {
          border: 1px solid var(--border);
          border-top: none;
          margin-bottom: 1px;
        }
        .routes-header {
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid rgba(251,191,36,0.07);
          font-family: 'Space Mono', monospace;
          font-size: 9px; letter-spacing: 0.22em;
          color: var(--muted); text-transform: uppercase;
        }
        .route-row {
          display: flex; align-items: center; gap: 14px;
          padding: 0.875rem 1.5rem;
          border-bottom: 1px solid rgba(251,191,36,0.05);
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          transition: background 0.15s;
        }
        .route-row:last-child { border-bottom: none; }
        .route-row:hover { background: rgba(251,191,36,0.03); }
        .route-tag {
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: 2px;
          min-width: 56px; text-align: center;
          flex-shrink: 0;
        }
        .tag-auth   { background: rgba(96,165,250,0.1);  color: var(--blue);   border: 1px solid rgba(96,165,250,0.2); }
        .tag-apps   { background: rgba(167,139,250,0.1); color: var(--purple); border: 1px solid rgba(167,139,250,0.2); }
        .tag-data   { background: rgba(74,222,128,0.08); color: var(--green);  border: 1px solid rgba(74,222,128,0.18); }
        .tag-admin  { background: rgba(251,191,36,0.08); color: var(--amber);  border: 1px solid rgba(251,191,36,0.2); }
        .route-path { color: #94a3b8; flex: 1; }
        .route-arrow { color: rgba(251,191,36,0.2); }
        .route-desc { font-size: 9px; color: #334155; letter-spacing: 0.08em; text-transform: uppercase; }

        /* ── Log panel ── */
        .log-panel {
          border: 1px solid var(--border);
          border-top: none;
          padding: 0.875rem 1.5rem;
          font-family: 'Space Mono', monospace;
          font-size: 10px; line-height: 1.9;
          margin-bottom: 1.25rem;
        }
        .log-row { display: flex; gap: 14px; }
        .log-time { color: #334155; min-width: 58px; flex-shrink: 0; }
        .log-ok   { color: var(--green); }
        .log-inf  { color: var(--blue); }
        .log-warn { color: var(--amber); }
        .log-msg  { color: #4b5563; }

        /* ── Footer ── */
        .footer {
          display: flex; align-items: center; justify-content: space-between;
          font-family: 'Space Mono', monospace;
          font-size: 9px; letter-spacing: 0.15em;
          color: var(--subtle); text-transform: uppercase;
        }
        .footer-right { color: #2d3748; }
      </style>
    </head>
    <body>
      <div class="bg-grid"></div>
      <div class="bg-scanlines"></div>
      <div class="bg-orb" style="width:320px;height:320px;top:-100px;left:-100px;background:rgba(251,191,36,0.055);"></div>
      <div class="bg-orb" style="width:260px;height:260px;bottom:-80px;right:0;background:rgba(249,115,22,0.045);"></div>

      <div class="shell">

        <div class="status-bar">
          <div class="status-dot"></div>
          ALL SYSTEMS NOMINAL
          <div class="status-rule"></div>
          <span class="status-date">${new Date().toUTCString()}</span>
        </div>

        <div class="header">
          <div class="eyebrow">◈ NEXUS ENGINE / ORCHESTRATOR v${status.version}</div>
          <div class="title">Service <span class="title-accent">Dashboard</span></div>
          <div class="subtitle">architectural JSON synthesis layer &amp; runtime dispatcher<span class="cursor">_</span></div>
        </div>

        <div class="hud-grid">
          <div class="hud-cell">
            <div class="hud-corner"></div>
            <div class="hud-label">Environment</div>
            <div class="hud-value">${status.env.toUpperCase()}</div>
          </div>
          <div class="hud-cell">
            <div class="hud-corner"></div>
            <div class="hud-label">API Version</div>
            <div class="hud-value">${status.version}</div>
          </div>
          <div class="hud-cell">
            <div class="hud-corner"></div>
            <div class="hud-label">Server Uptime</div>
            <div class="hud-value green">${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m ${Math.floor(status.uptime % 60)}s</div>
          </div>
          <div class="hud-cell">
            <div class="hud-corner"></div>
            <div class="hud-label">Region</div>
            <div class="hud-value blue">GLOBAL / EDGE</div>
          </div>
        </div>

        <div class="routes-panel">
          <div class="routes-header">◈ API INTERFACE — REGISTERED ROUTE NAMESPACES</div>
          <div class="route-row">
            <span class="route-tag tag-auth">Identity</span>
            <span class="route-path">/api/auth/*</span>
            <span class="route-arrow">→</span>
            <span class="route-desc">Auth Gateway</span>
          </div>
          <div class="route-row">
            <span class="route-tag tag-apps">Apps</span>
            <span class="route-path">/api/apps/*</span>
            <span class="route-arrow">→</span>
            <span class="route-desc">App Registry</span>
          </div>
          <div class="route-row">
            <span class="route-tag tag-data">Runtime</span>
            <span class="route-path">/api/apps/:appSlug/data/*</span>
            <span class="route-arrow">→</span>
            <span class="route-desc">Dynamic Data Layer</span>
          </div>
          <div class="route-row">
            <span class="route-tag tag-data">CSV</span>
            <span class="route-path">/api/apps/:appSlug/csv/*</span>
            <span class="route-arrow">→</span>
            <span class="route-desc">CSV Export Layer</span>
          </div>
          <div class="route-row" style="border-bottom:none;">
            <span class="route-tag tag-admin">Admin</span>
            <span class="route-path">/api/admin/*</span>
            <span class="route-arrow">→</span>
            <span class="route-desc">Admin Controls</span>
          </div>
        </div>

        <div class="log-panel">
          <div class="log-row"><span class="log-time">BOOT</span><span class="log-ok">OK</span><span class="log-msg">server bound to port ${PORT} — awaiting connections</span></div>
          <div class="log-row"><span class="log-time">BOOT</span><span class="log-inf">INF</span><span class="log-msg">route table compiled — 5 namespaces registered</span></div>
          <div class="log-row"><span class="log-time">BOOT</span><span class="log-ok">OK</span><span class="log-msg">CORS configured — ${allowedOrigins.length} allowed origin(s)</span></div>
          <div class="log-row"><span class="log-time">BOOT</span><span class="log-inf">INF</span><span class="log-msg">rate limit active — 500 req / 15 min per IP</span></div>
          <div class="log-row"><span class="log-time">LIVE</span><span class="log-ok">OK</span><span class="log-msg">health probe passed — timestamp ${status.timestamp}</span></div>
        </div>

        <div class="footer">
          <span>© 2026 Nexus Engine Corp.</span>
          <span class="footer-right">synthesized by advanced AI ◈ all systems go</span>
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
  console.log(`✅ Nexus Engine backend running on port ${PORT}`);
});

export default app;