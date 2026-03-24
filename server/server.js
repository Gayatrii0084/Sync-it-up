const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB } = require('./config/db');
const authRoutes  = require('./routes/auth');
const matchRoutes = require('./routes/match');
const chatRoutes  = require('./routes/chat');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'syncitup_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,    // set true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
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
      console.log(`📌 To make an admin: db.users.updateOne({email:'you@x.com'},{$set:{role:'admin'}})`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();
