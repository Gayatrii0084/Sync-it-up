const express = require('express');
const path    = require('path');
const cors    = require('cors');
const session = require('express-session');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/db');
const authRoutes  = require('./routes/auth');
const matchRoutes = require('./routes/match');
const chatRoutes  = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ─── TRUST PROXY (required for Render / Heroku reverse proxy) ──────
if (isProd) app.set('trust proxy', 1);

// ─── CORS ──────────────────────────────────────────────────────────
// For unified deployment (frontend + backend on same Render URL),
// the origin is the same so CORS isn't strictly needed.
// ALLOWED_ORIGIN env var lets you add a separate frontend URL later.
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ─── MIDDLEWARE ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'syncitup_fallback_secret_change_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,        // HTTPS in production (Render provides HTTPS)
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',  // 'none' needed for cross-site if ever separated
    maxAge: 24 * 60 * 60 * 1000,        // 24 hours
  },
}));

// ─── STATIC FILES ─────────────────────────────────────────────────
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ─── API ROUTES ───────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat',  chatRoutes);
app.use('/api/admin', adminRoutes);

// ─── PAGE ROUTES ──────────────────────────────────────────────────
app.get('/pages/:page', (req, res) => {
  const pagePath = path.join(__dirname, '../client/pages', req.params.page);
  res.sendFile(pagePath, (err) => {
    if (err) res.status(404).send('Page not found');
  });
});

// ─── START ────────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 SyncItUp running at http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${isProd ? 'production' : 'development'}`);
      console.log(`📌 To make an admin: db.users.updateOne({email:'you@x.com'},{$set:{role:'admin'}})`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();

