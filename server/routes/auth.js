const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, OTP, InviteCode } = require('../config/db');
const { generateOTP, getExpiryTime } = require('../utils/otpGenerator');
const { sendOTPEmail } = require('../utils/emailService');
const { isAuthenticated } = require('../middleware/authMiddleware');

// ─── SEND OTP ─────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { name, email, password, college_name, skills, interests, availability, invite_code } = req.body;

  if (!name || !email || !password || !college_name) {
    return res.json({ success: false, message: 'All required fields must be filled.' });
  }

  // ─── INVITE CODE VALIDATION (NEW) ──────────────────────────────
  if (!invite_code || !invite_code.trim()) {
    return res.json({ success: false, message: 'Invite code is required.' });
  }

  const inviteDoc = await InviteCode.findOne({ code: invite_code.trim().toUpperCase(), active: true });
  if (!inviteDoc) {
    return res.json({ success: false, message: 'Invalid or inactive invite code.' });
  }
  if (new Date() > new Date(inviteDoc.expires_at)) {
    return res.json({ success: false, message: 'Invite code has expired.' });
  }
  if (inviteDoc.used_count >= inviteDoc.usage_limit) {
    return res.json({ success: false, message: 'Invite code usage limit reached.' });
  }
  // Store invite code id in session so verify-otp can increment the counter
  req.session.pendingInviteId = inviteDoc._id.toString();
  // ─── END INVITE CODE VALIDATION ─────────────────────────────────

  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;
  if (!pwdRegex.test(password)) {
    return res.json({ success: false, message: 'Password needs 8+ chars, uppercase, lowercase, number, and special character.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.json({ success: false, message: 'Email already registered.' });

    await OTP.deleteMany({ email: email.toLowerCase() });

    const otp = generateOTP();

    console.log("OTP for", email, "is:", otp);   // ADD THIS LINE

    const expiry = getExpiryTime();

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      expiry_time: expiry
    });

    req.session.pendingUser = { name, email: email.toLowerCase(), password, college_name, skills, interests, availability };

    let emailNote = '';

    /// send email in background (do NOT wait)
    sendOTPEmail(email, otp).catch(emailErr => {
      console.error('⚠️ Email send failed:', emailErr.message);
    });

    return res.json({
      success: true,
      message: 'OTP generated'
    });

  } catch (err) {
    console.error('Send OTP error:', err);
    return res.json({ success: false, message: 'Failed to generate OTP.' });
  }
});

// ─── RESEND OTP ────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: 'Email is required.' });

  try {
    await OTP.deleteMany({ email: email.toLowerCase() });
    const otp = generateOTP();
    const expiry = getExpiryTime();
    await OTP.create({ email: email.toLowerCase(), otp, expiry_time: expiry });
    await sendOTPEmail(email, otp);
    res.json({ success: true, message: 'New OTP sent.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to resend OTP.' });
  }
});

// ─── VERIFY OTP & REGISTER ────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.json({ success: false, message: 'Email and OTP are required.' });

  try {
    const record = await OTP.findOne({ email: email.toLowerCase(), otp })
      .sort({ created_at: -1 })
      .limit(1);

    if (!record) return res.json({ success: false, message: 'Invalid OTP.' });

    if (new Date() > record.expiry_time) {
      return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const pendingUser = req.session.pendingUser;
    if (!pendingUser || pendingUser.email !== email.toLowerCase()) {
      return res.json({ success: false, message: 'Session expired. Please sign up again.' });
    }

    const hashedPassword = await bcrypt.hash(pendingUser.password, 12);
    await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: hashedPassword,
      college_name: pendingUser.college_name,
      skills: pendingUser.skills || '',
      interests: pendingUser.interests || '',
      availability: pendingUser.availability || '',
    });

    await OTP.deleteMany({ email: email.toLowerCase() });
    delete req.session.pendingUser;

    // ─── INCREMENT INVITE CODE USAGE (NEW) ──────────────────
    if (req.session.pendingInviteId) {
      await InviteCode.findByIdAndUpdate(
        req.session.pendingInviteId,
        { $inc: { used_count: 1 } }
      );
      delete req.session.pendingInviteId;
    }

    res.json({ success: true, message: 'Account created successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.json({ success: false, message: 'Verification failed.' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, message: 'Email and password are required.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: false, message: 'Invalid email or password.' });

    if (user.is_blocked) {
      return res.json({ success: false, message: 'Your account has been blocked. Contact admin.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'Invalid email or password.' });

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      college_name: user.college_name,
      role: user.role
    };

    res.json({ success: true, message: 'Login successful.', role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ success: false, message: 'Login failed.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.json({ success: false, message: 'Logout failed.' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out.' });
  });
});

// ─── GET SESSION USER ─────────────────────────────────────────────
router.get('/me', isAuthenticated, (req, res) => {
  res.json({ success: true, user: req.session.user });
});

// ─── GET OWN PROFILE ─────────────────────────────────────────────
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).select('-password');
    if (!user) return res.json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch profile.' });
  }
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────
router.put('/profile', isAuthenticated, async (req, res) => {
  const { name, college_name, skills, interests, availability, bio } = req.body;
  try {
    await User.findByIdAndUpdate(req.session.user.id, { name, college_name, skills, interests, availability, bio });
    req.session.user.name = name;
    req.session.user.college_name = college_name;
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    res.json({ success: false, message: 'Update failed.' });
  }
});

module.exports = router;
