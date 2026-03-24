/* ══════════════════════════════════════════════════════════════════
   app.js — Shared utilities, toast notifications, navbar logic
   ══════════════════════════════════════════════════════════════════ */

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── API HELPER ───────────────────────────────────────────────────
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include',
      ...options
    });
    return await response.json();
  } catch (err) {
    console.error('API error:', err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

// ─── AVATAR INITIALS ──────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ─── FORMAT DATE ──────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (d.toDateString() === now.toDateString()) return formatTime(dateStr);
  return formatDate(dateStr);
}

// ─── SKILL TAG RENDERER ───────────────────────────────────────────
function renderSkillTags(skills, limit = 5) {
  if (!skills) return '<span class="tag tag-secondary">No skills listed</span>';
  const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
  const shown = skillList.slice(0, limit);
  const extra = skillList.length - limit;
  let html = shown.map(s => `<span class="tag tag-primary">${s}</span>`).join('');
  if (extra > 0) html += `<span class="tag tag-secondary">+${extra}</span>`;
  return html;
}

// ─── AVAILABILITY BADGE ───────────────────────────────────────────
function renderAvailability(avail) {
  const map = {
    'full-time': { label: 'Full-Time', cls: 'badge-success' },
    'part-time': { label: 'Part-Time', cls: 'badge-primary' },
    'weekends': { label: 'Weekends', cls: 'badge-warning' },
  };
  const info = map[avail] || { label: avail || 'Unknown', cls: 'badge-primary' };
  return `<span class="badge ${info.cls}">${info.label}</span>`;
}

// ─── NAVBAR ACTIVE LINK ───────────────────────────────────────────
function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') && path.includes(link.getAttribute('href').replace('../', ''))) {
      link.classList.add('active');
    }
  });
}

// ─── MOBILE NAV TOGGLE ────────────────────────────────────────────
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    });
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────
async function logout() {
  const res = await apiRequest('/api/auth/logout', { method: 'POST' });
  if (res.success) {
    window.location.href = '/';
  } else {
    showToast('Logout failed', 'error');
  }
}

// ─── AUTH GUARD (redirect if not logged in) ───────────────────────
async function requireAuth(role = null) {
  const res = await apiRequest('/api/auth/me');
  if (!res.success) {
    window.location.href = '/pages/login.html';
    return null;
  }
  if (role && res.user.role !== role) {
    if (res.user.role === 'admin') {
      window.location.href = '/pages/admin.html';
    } else {
      window.location.href = '/pages/dashboard.html';
    }
    return null;
  }
  return res.user;
}

// ─── POPULATE NAV AVATAR ─────────────────────────────────────────
function populateNavUser(user) {
  const avatarEl = document.querySelector('.nav-avatar');
  if (avatarEl && user) {
    avatarEl.textContent = getInitials(user.name);
    avatarEl.title = user.name;
  }
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setActiveNavLink();
  initMobileNav();
});
