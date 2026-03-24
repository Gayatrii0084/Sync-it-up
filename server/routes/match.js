const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, Match, Message, Report } = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isStudent } = require('../middleware/roleMiddleware');

// ─── HELPER: valid ObjectId ────────────────────────────────────────
function isValidId(id) { return mongoose.Types.ObjectId.isValid(id); }

// ─── SEARCH STUDENTS ──────────────────────────────────────────────
router.get('/search', isAuthenticated, isStudent, async (req, res) => {
  const { skills, interests, availability } = req.query;
  const userId = req.session.user.id;
  const college = req.session.user.college_name;

  try {
    const filter = {
      _id: { $ne: userId },
      role: 'student',
      is_blocked: false,
      college_name: college
    };

    if (skills)       filter.skills       = { $regex: skills, $options: 'i' };
    if (interests)    filter.interests    = { $regex: interests, $options: 'i' };
    if (availability) filter.availability = availability;

    const students = await User.find(filter).select('-password').lean();
    res.json({ success: true, students });
  } catch (err) {
    console.error('Search error:', err);
    res.json({ success: false, message: 'Search failed.' });
  }
});

// ─── SEND REQUEST ─────────────────────────────────────────────────
router.post('/request', isAuthenticated, isStudent, async (req, res) => {
  const { receiver_id } = req.body;
  const sender_id = req.session.user.id;

  if (!receiver_id || !isValidId(receiver_id)) return res.json({ success: false, message: 'Invalid receiver.' });

  try {
    const existing = await Match.findOne({ sender_id, receiver_id });
    if (existing) return res.json({ success: false, message: 'Request already sent.' });

    await Match.create({ sender_id, receiver_id, status: 'pending' });
    res.json({ success: true, message: 'Collaboration request sent.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to send request.' });
  }
});

// ─── INCOMING REQUESTS ────────────────────────────────────────────
router.get('/requests/incoming', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const requests = await Match.find({ receiver_id: userId, status: 'pending' })
      .populate('sender_id', 'name email college_name skills availability')
      .lean();

    const data = requests.map(r => ({
      id: r._id,
      sender_id: r.sender_id._id,
      name: r.sender_id.name,
      email: r.sender_id.email,
      college_name: r.sender_id.college_name,
      skills: r.sender_id.skills,
      availability: r.sender_id.availability,
      created_at: r.created_at
    }));

    res.json({ success: true, requests: data });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch requests.' });
  }
});

// ─── OUTGOING REQUESTS ────────────────────────────────────────────
router.get('/requests/outgoing', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const requests = await Match.find({ sender_id: userId })
      .populate('receiver_id', 'name email college_name skills availability')
      .lean();

    const data = requests.map(r => ({
      id: r._id,
      receiver_id: r.receiver_id._id,
      name: r.receiver_id.name,
      email: r.receiver_id.email,
      college_name: r.receiver_id.college_name,
      skills: r.receiver_id.skills,
      availability: r.receiver_id.availability,
      status: r.status,
      created_at: r.created_at
    }));

    res.json({ success: true, requests: data });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch outgoing requests.' });
  }
});

// ─── RESPOND TO REQUEST ───────────────────────────────────────────
router.put('/request/:id', isAuthenticated, isStudent, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.session.user.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.json({ success: false, message: 'Invalid status.' });
  }
  if (!isValidId(id)) return res.json({ success: false, message: 'Invalid request ID.' });

  try {
    const match = await Match.findById(id);
    if (!match) return res.json({ success: false, message: 'Request not found.' });
    if (match.receiver_id.toString() !== userId) return res.json({ success: false, message: 'Unauthorized.' });

    match.status = status;
    await match.save();
    res.json({ success: true, message: `Request ${status}.` });
  } catch (err) {
    res.json({ success: false, message: 'Failed to update request.' });
  }
});

// ─── ACCEPTED CONNECTIONS ─────────────────────────────────────────
router.get('/connections', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const matches = await Match.find({
      status: 'accepted',
      $or: [{ sender_id: userId }, { receiver_id: userId }]
    }).lean();

    const partnerIds = matches.map(m =>
      m.sender_id.toString() === userId ? m.receiver_id : m.sender_id
    );

    const connections = await User.find({
      _id: { $in: partnerIds },
      is_blocked: false
    }).select('name email college_name skills availability').lean();

    res.json({ success: true, connections });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch connections.' });
  }
});

// ─── REPORT USER ──────────────────────────────────────────────────
router.post('/report', isAuthenticated, isStudent, async (req, res) => {
  const { reported_user_id, reason } = req.body;
  const reported_by = req.session.user.id;

  if (!isValidId(reported_user_id)) return res.json({ success: false, message: 'Invalid user.' });

  try {
    const msgs = await Message.find({
      $or: [
        { sender_id: reported_by, receiver_id: reported_user_id },
        { sender_id: reported_user_id, receiver_id: reported_by }
      ]
    }).sort({ timestamp: -1 }).limit(5).lean();

    await Report.create({
      reported_user_id,
      reported_by,
      reason,
      last_messages: JSON.stringify(msgs)
    });

    res.json({ success: true, message: 'User reported.' });
  } catch (err) {
    console.error('Report error:', err);
    res.json({ success: false, message: 'Failed to report.' });
  }
});

module.exports = router;
