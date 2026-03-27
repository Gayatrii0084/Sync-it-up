/**
 * routes/adminInvite.js — Admin Invite Code Management (NEW)
 * Allows admins to create, list, and delete invite codes.
 * Mounted at /api/admin/invite in server.js.
 */

const express    = require('express');
const router     = express.Router();
const crypto     = require('crypto');
const { InviteCode } = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isAdmin }         = require('../middleware/roleMiddleware');

// ─── CREATE INVITE CODE ───────────────────────────────────────────
// POST /api/admin/invite/create
// Body: { usage_limit?, expires_in_days? }
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  const adminId = req.session.user.id;
  const {
    usage_limit    = 1,
    expires_in_days = 7,
    custom_code,          // optional: admin can specify a code
  } = req.body;

  try {
    // Generate a random 8-char uppercase alphanumeric code, or use custom
    const code = custom_code
      ? custom_code.trim().toUpperCase()
      : crypto.randomBytes(4).toString('hex').toUpperCase();

    // Check uniqueness if custom code
    if (custom_code) {
      const exists = await InviteCode.findOne({ code });
      if (exists) return res.json({ success: false, message: 'This code already exists.' });
    }

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + Number(expires_in_days));

    const invite = await InviteCode.create({
      code,
      created_by_admin: adminId,
      usage_limit: Number(usage_limit),
      expires_at,
      active: true,
    });

    res.json({ success: true, message: 'Invite code created!', invite: {
      _id:         invite._id,
      code:        invite.code,
      usage_limit: invite.usage_limit,
      used_count:  invite.used_count,
      expires_at:  invite.expires_at,
      active:      invite.active,
    }});
  } catch (err) {
    console.error('Create invite error:', err);
    res.json({ success: false, message: 'Failed to create invite code.' });
  }
});

// ─── LIST ALL INVITE CODES ────────────────────────────────────────
// GET /api/admin/invite/all
router.get('/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const codes = await InviteCode.find()
      .sort({ created_at: -1 })
      .lean();

    const result = codes.map(c => ({
      _id:         c._id.toString(),
      code:        c.code,
      usage_limit: c.usage_limit,
      used_count:  c.used_count,
      expires_at:  c.expires_at,
      active:      c.active,
      created_at:  c.created_at,
      // Computed status for display
      status: !c.active
        ? 'Disabled'
        : new Date() > new Date(c.expires_at)
          ? 'Expired'
          : c.used_count >= c.usage_limit
            ? 'Exhausted'
            : 'Active',
    }));

    res.json({ success: true, codes: result });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch invite codes.' });
  }
});

// ─── DISABLE / DELETE INVITE CODE ────────────────────────────────
// DELETE /api/admin/invite/delete/:id
router.delete('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await InviteCode.findByIdAndDelete(id);
    res.json({ success: true, message: 'Invite code deleted.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to delete invite code.' });
  }
});

// ─── TOGGLE ACTIVE STATE ──────────────────────────────────────────
// PUT /api/admin/invite/toggle/:id
router.put('/toggle/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const code = await InviteCode.findById(id);
    if (!code) return res.json({ success: false, message: 'Code not found.' });
    code.active = !code.active;
    await code.save();
    res.json({ success: true, message: `Code ${code.active ? 'enabled' : 'disabled'}.`, active: code.active });
  } catch (err) {
    res.json({ success: false, message: 'Failed to toggle code.' });
  }
});

module.exports = router;
