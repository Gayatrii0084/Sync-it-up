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
5. Click **Connect** → **Compass / Drivers** → copy the connection string:
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
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/syncitup.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` (it is already).

---

## Step 4 – Deploy on Render

1. Go to [render.com](https://render.com) → Sign in with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `syncitup` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Under **Environment Variables**, add all of the following:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MONGO_URI` | *(your MongoDB Atlas connection string)* |
| `SESSION_SECRET` | *(generate: any long random string)* |
| `EMAIL_USER` | *(your Gmail address)* |
| `EMAIL_PASS` | *(your Gmail App Password)* |
| `ALLOWED_ORIGIN` | *(your Render URL, e.g. `https://syncitup.onrender.com`)* |

6. Click **Deploy**. Wait 2-3 minutes for the first build to complete.

---

## Step 5 – Create Your First Admin

After deployment, open the Render shell or MongoDB Atlas Data Explorer and run:

```js
db.users.updateOne({ email: 'your@email.com' }, { $set: { role: 'admin' } })
```

---

## Step 6 – Verify Deployment

Open your Render URL (e.g. `https://syncitup.onrender.com`) and check:

- [ ] Home page loads with hero section
- [ ] Features and How It Works pages load
- [ ] Sign Up form works and sends OTP email
- [ ] Login works
- [ ] Find Teammates page shows students
- [ ] Chat works between connected users

---

## Making Changes After Deployment

Render auto-deploys on every push to your `main` branch:
```bash
git add .
git commit -m "Your change"
git push
```

---

## Local Development

```bash
# 1. Copy env template
cp .env.example .env
# Edit .env with your real values

# 2. Start dev server
npm run dev

# 3. Open http://localhost:3000
```

> **Note:** Render free tier spins down after 15 minutes of inactivity. First load after idle will take ~30 seconds to start.
