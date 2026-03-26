/* ──────────────────────────────────────────────────────────────────
   SyncItUp – Shared Frontend Utilities
   ────────────────────────────────────────────────────────────────── */

// ─── API BASE URL (set in client/js/config.js) ────────────────────
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '';

// ─── API HELPER ───────────────────────────────────────────────────
async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(API_BASE + url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      credentials: 'include',
      ...options
    });
    return await res.json();
  } catch (err) {
    console.error('API error:', url, err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

// ─── AUTH GUARD ───────────────────────────────────────────────────
async function requireAuth(expectedRole) {
  const res = await apiRequest('/api/auth/me');
  if (!res.success) { window.location.href = '/pages/login.html'; return null; }
  const user = res.user;
  if (expectedRole === 'admin' && user.role !== 'admin') { window.location.href = '/pages/dashboard.html'; return null; }
  if (expectedRole === 'student' && user.role !== 'student') { window.location.href = '/pages/admin.html'; return null; }
  return user;
}

// ─── LOGOUT ───────────────────────────────────────────────────────
async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  window.location.href = '/pages/login.html';
}

// ─── NAV USER ─────────────────────────────────────────────────────
function populateNavUser(user) {
  const el = document.getElementById('navAvatar');
  if (el) el.textContent = getInitials(user.name);
}

// ─── TOAST NOTIFICATIONS ──────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span style="width:18px;height:18px;border-radius:50%;background:${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--primary)'};color:white;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0">${icons[type] || 'i'}</span><span>${message}</span>`;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ─── INITIALS ─────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

// ─── DATE FORMAT ──────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── SKILL TAGS ───────────────────────────────────────────────────
function renderSkillTags(skillsStr, max = 99) {
  if (!skillsStr?.trim()) return '<span style="color:var(--text-muted);font-size:0.78rem">—</span>';
  return skillsStr.split(',').map(s => s.trim()).filter(Boolean).slice(0, max)
    .map(s => `<span class="tag tag-primary">${s}</span>`).join('');
}

function renderInterestTags(interestsStr, max = 99) {
  if (!interestsStr?.trim()) return '<span style="color:var(--text-muted);font-size:0.78rem">—</span>';
  return interestsStr.split(',').map(s => s.trim()).filter(Boolean).slice(0, max)
    .map(s => `<span class="tag tag-secondary">${s}</span>`).join('');
}

// ─── AVAILABILITY BADGE ───────────────────────────────────────────
function renderAvailability(availability) {
  const map = {
    'full-time': ['avail-fulltime', 'Full Time'],
    'part-time': ['avail-parttime', 'Part Time'],
    'weekends':  ['avail-weekends', 'Weekends'],
  };
  const [cls, label] = map[availability] || ['avail-parttime', availability || 'Flexible'];
  return `<span class="avail-badge ${cls}">${label}</span>`;
}

// ─── MOBILE NAVBAR TOGGLE ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }
});
