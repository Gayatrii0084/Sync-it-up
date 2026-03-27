# SyncItUp – Deployment Guide

## Architecture

```
SyncItUp/
├── client/          ← Static frontend (HTML, CSS, JS)
├── server/          ← Node.js + Express backend
├── package.json
├── .env             ← NOT committed (see .env.example)
└── .env.example     ← Template for environment variables
```

**Deployment strategy:** Deploy **everything on Render** (free tier).  
Express serves the `client/` folder as static files alongside the API — no separate frontend hosting needed.

---

## Step 1 – Set Up MongoDB Atlas (Free Database)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Sign up free
2. Create a **free M0 cluster** (any region)
3. In **Database Access** → Add user → set username + password
4. In **Network Access** → Add IP: `0.0.0.0/0` (allow all — needed for Render)
5. Click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/syncitup?retryWrites=true&w=majority
   ```

---

## Step 2 – Set Up Gmail App Password (for OTP emails)

1. Go to your Google Account → **Security** → **2-Step Verification** (must be ON)
2. Search **App passwords** → Create one for "Mail"
3. Copy the 16-character app password

---

## Step 3 – Push Code to GitHub

```bash
git add .
git commit -m "Add group matching and invite code features"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/syncitup.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` (it already is).

---

## Step 4 – Deploy on Render

1. Go to [render.com](https://render.com) → Sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:

| Setting | Value |
|---|---|
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Add **Environment Variables**:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | *(MongoDB Atlas connection string)* |
| `SESSION_SECRET` | *(any long random string)* |
| `EMAIL_USER` | *(your Gmail address)* |
| `EMAIL_PASS` | *(your Gmail App Password)* |
| `ALLOWED_ORIGIN` | *(your Render URL, e.g. `https://syncitup.onrender.com`)* |

6. Click **Deploy** — wait 2–3 minutes.

---

## Step 5 – Create Your First Admin

In MongoDB Atlas → **Data Explorer** → `syncitup` → `users` collection, run:

```js
db.users.updateOne({ email: 'your@email.com' }, { $set: { role: 'admin' } })
```

---

## Step 6 – Create First Invite Code ⚠️ REQUIRED

New users **cannot register** without an invite code. Do this right after deployment.

1. Log in as admin on your live site
2. Open browser DevTools → **Console** and run:

```javascript
fetch('/api/admin/invite/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    custom_code: 'SYNCITUP2024',
    usage_limit: 100,
    expires_in_days: 365
  })
}).then(r => r.json()).then(console.log);
```

3. Share `SYNCITUP2024` with students for registration.

---

## Step 7 – Verify Deployment

- [ ] Home page loads
- [ ] Sign Up with invite code → OTP email sent → account created
- [ ] Login works
- [ ] Find Teammates (`/pages/match.html`) shows students
- [ ] 1-to-1 chat works
- [ ] Teams page (`/pages/team.html`) — create multiple teams
- [ ] Team match + group chat works after match accepted
- [ ] Admin invite codes manageable via console API

---

## Updating After Deployment

Render auto-deploys on every push to `main`:

```bash
git add .
git commit -m "describe your change"
git push
```

---

## Local Development

```bash
cp .env.example .env   # fill in your values
npm run dev            # starts on http://localhost:3000
```

> **Note:** Render free tier sleeps after 15 min idle. First request after sleep takes ~30s.
