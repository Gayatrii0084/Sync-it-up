/* ══════════════════════════════════════════════════════════════════
   auth.js — Handles signup, OTP, and login frontend logic
   ══════════════════════════════════════════════════════════════════ */

// ─── PASSWORD STRENGTH ────────────────────────────────────────────
function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&#^()_\-+=]/.test(password)) score++;
  return score;
}

function updateStrengthBar(password) {
  const bar = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!bar || !text) return;

  const score = checkPasswordStrength(password);
  const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];
  const colors = ['', '#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'];
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  bar.style.width = widths[score];
  bar.style.background = colors[score];
  text.textContent = password ? labels[score] : '';
  text.style.color = colors[score];
}

// ─── TOGGLE PASSWORD VISIBILITY ───────────────────────────────────
function togglePassword(id, eyeId) {
  const input = document.getElementById(id);
  const eye = document.getElementById(eyeId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (eye) eye.textContent = '🙈';
  } else {
    input.type = 'password';
    if (eye) eye.textContent = '👁️';
  }
}

// ─── SIGNUP FORM ─────────────────────────────────────────────────
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  const pwdInput = document.getElementById('password');
  if (pwdInput) {
    pwdInput.addEventListener('input', () => updateStrengthBar(pwdInput.value));
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = signupForm.querySelector('button[type="submit"]');
    const alertEl = document.getElementById('signupAlert');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const college_name = document.getElementById('college_name').value.trim();
    const skills = document.getElementById('skills').value.trim();
    const interests = document.getElementById('interests').value.trim();
    const availability = document.getElementById('availability').value;

    // Client-side validations
    if (password !== confirmPassword) {
      showAlert(alertEl, 'Passwords do not match.', 'error');
      return;
    }

    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;
    if (!pwdRegex.test(password)) {
      showAlert(alertEl, 'Password needs: 8+ chars, uppercase, lowercase, number, special char.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending OTP...';

    const res = await apiRequest('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, college_name, skills, interests, availability })
    });

    if (res.success) {
      sessionStorage.setItem('otp_email', email);
      window.location.href = '/pages/otp.html';
    } else {
      showAlert(alertEl, res.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Send OTP & Continue';
    }
  });
}

// ─── OTP FORM ─────────────────────────────────────────────────────
const otpForm = document.getElementById('otpForm');
if (otpForm) {
  const email = sessionStorage.getItem('otp_email');
  if (!email) {
    window.location.href = '/pages/signup.html';
  }

  // Display masked email
  const emailDisplay = document.getElementById('otpEmail');
  if (emailDisplay) {
    const [user, domain] = email.split('@');
    emailDisplay.textContent = user.substring(0, 3) + '***@' + domain;
  }

  // OTP input auto-focus
  const otpInputs = document.querySelectorAll('.otp-input');
  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 1);
      if (e.target.value && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
      if (e.key === 'ArrowLeft' && idx > 0) otpInputs[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });
    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      [...pasted].slice(0, 6).forEach((digit, i) => {
        if (otpInputs[i]) otpInputs[i].value = digit;
      });
      const nextEmpty = [...otpInputs].findIndex(inp => !inp.value);
      if (nextEmpty !== -1) otpInputs[nextEmpty].focus();
    });
  });

  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = otpForm.querySelector('button[type="submit"]');
    const alertEl = document.getElementById('otpAlert');
    const otp = [...otpInputs].map(i => i.value).join('');

    if (otp.length !== 6) {
      showAlert(alertEl, 'Please enter all 6 digits.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const res = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });

    if (res.success) {
      sessionStorage.removeItem('otp_email');
      showAlert(alertEl, 'Account created! Redirecting to login...', 'success');
      setTimeout(() => { window.location.href = '/pages/login.html'; }, 2000);
    } else {
      showAlert(alertEl, res.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Verify OTP';
    }
  });

  // Resend OTP
  const resendBtn = document.getElementById('resendOtp');
  let resendTimer;
  function startResendCooldown() {
    let seconds = 60;
    resendBtn.disabled = true;
    resendTimer = setInterval(() => {
      resendBtn.textContent = `Resend OTP (${seconds}s)`;
      seconds--;
      if (seconds < 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
      }
    }, 1000);
  }

  if (resendBtn) {
    startResendCooldown();
    resendBtn.addEventListener('click', async () => {
      const alertEl = document.getElementById('otpAlert');
      const res = await apiRequest('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      showAlert(alertEl, res.message, res.success ? 'success' : 'error');
      if (res.success) startResendCooldown();
    });
  }
}

// ─── LOGIN FORM ───────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    const alertEl = document.getElementById('loginAlert');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    btn.disabled = true;
    btn.textContent = 'Signing In...';

    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res.success) {
      if (res.role === 'admin') {
        window.location.href = '/pages/admin.html';
      } else {
        window.location.href = '/pages/dashboard.html';
      }
    } else {
      showAlert(alertEl, res.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

// ─── SHOW ALERT HELPER ────────────────────────────────────────────
function showAlert(el, message, type) {
  if (!el) { showToast(message, type); return; }
  el.className = `alert alert-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
  el.textContent = message;
  el.classList.remove('d-none');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
