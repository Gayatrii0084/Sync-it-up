const express = require('express');
const router = express.Router();
const { User, Report } = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// ─── STATS ────────────────────────────────────────────────────────
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
  const college = req.session.user.college_name;
  try {
    const [totalStudents, blockedUsers] = await Promise.all([
      User.countDocuments({ college_name: college, role: 'student' }),
      User.countDocuments({ college_name: college, role: 'student', is_blocked: true }),
    ]);

    // Count reports where reported user is from same college
    const collegeStudentIds = await User.find({ college_name: college, role: 'student' }).select('_id').lean();
    const ids = collegeStudentIds.map(u => u._id);
    const reportedUsers = await Report.countDocuments({ reported_user_id: { $in: ids } });

    res.json({ success: true, stats: { totalStudents, reportedUsers, blockedUsers } });
  } catch (err) {
    res.json({ success: false, message: 'Failed to load stats.' });
  }
});

// ─── ALL STUDENTS FROM SAME COLLEGE ───────────────────────────────
router.get('/students', isAuthenticated, isAdmin, async (req, res) => {
  const college = req.session.user.college_name;
  try {
    const students = await User.find({ college_name: college, role: 'student' })
      .select('-password')
      .sort({ created_at: -1 })
      .lean();
    res.json({ success: true, students });
  } catch (err) {
    res.json({ success: false, message: 'Failed to fetch students.' });
  }
});

// ─── REPORTS ──────────────────────────────────────────────────────
router.get('/reports', isAuthenticated, isAdmin, async (req, res) => {
  const college = req.session.user.college_name;
  try {
    const collegeStudents = await User.find({ college_name: college }).select('_id').lean();
    const ids = collegeStudents.map(u => u._id);

    const reports = await Report.find({ reported_user_id: { $in: ids } })
      .populate('reported_user_id', 'name email is_blocked college_name')
      .populate('reported_by', 'name email')
      .sort({ created_at: -1 })
      .lean();

    const data = reports.map(r => ({
      id: r._id,
      reported_user_id: r.reported_user_id?._id,
      reported_name: r.reported_user_id?.name,
      reported_email: r.reported_user_id?.email,
      is_blocked: r.reported_user_id?.is_blocked,
      reported_by_name: r.reported_by?.name,
      reason: r.reason,
      last_messages: r.last_messages,
      created_at: r.created_at
    }));

    res.json({ success: true, reports: data });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to load reports.' });
  }
});

// ─── BLOCK ────────────────────────────────────────────────────────
router.put('/block/:userId', isAuthenticated, isAdmin, async (req, res) => {
  const { userId } = req.params;
  const college = req.session.user.college_name;
  try {
    const user = await User.findOne({ _id: userId, college_name: college });
    if (!user) return res.json({ success: false, message: 'User not found in your college.' });
    await User.findByIdAndUpdate(userId, { is_blocked: true });
    res.json({ success: true, message: 'User blocked.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to block user.' });
  }
});

// ─── UNBLOCK ──────────────────────────────────────────────────────
router.put('/unblock/:userId', isAuthenticated, isAdmin, async (req, res) => {
  const { userId } = req.params;
  const college = req.session.user.college_name;
  try {
    await User.findOneAndUpdate({ _id: userId, college_name: college }, { is_blocked: false });
    res.json({ success: true, message: 'User unblocked.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to unblock user.' });
  }
});

// ─── DELETE ───────────────────────────────────────────────────────
router.delete('/user/:userId', isAuthenticated, isAdmin, async (req, res) => {
  const { userId } = req.params;
  const college = req.session.user.college_name;
  try {
    const user = await User.findOne({ _id: userId, college_name: college });
    if (!user) return res.json({ success: false, message: 'User not found in your college.' });
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to delete user.' });
  }
});

// ─── BLOCKED LIST ─────────────────────────────────────────────────
router.get('/blocked', isAuthenticated, isAdmin, async (req, res) => {
  const college = req.session.user.college_name;
  try {
    const users = await User.find({ college_name: college, is_blocked: true, role: 'student' })
      .select('name email college_name created_at').lean();
    res.json({ success: true, users });
  } catch (err) {
    res.json({ success: false, message: 'Failed to load blocked users.' });
  }
});

module.exports = router;
