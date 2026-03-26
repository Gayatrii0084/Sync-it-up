/* ──────────────────────────────────────────────────────────────────
   SyncItUp – API Base URL Configuration
   ──────────────────────────────────────────────────────────────────
   For unified Render deployment (frontend + backend same domain):
     Keep API_BASE as empty string '' — all requests go to same origin.

   For separate deployment (Netlify/Vercel frontend + Render backend):
     Set API_BASE to your Render backend URL, e.g.:
     window.API_BASE = 'https://syncitup-backend.onrender.com';
   ────────────────────────────────────────────────────────────────── */
window.API_BASE = '';
