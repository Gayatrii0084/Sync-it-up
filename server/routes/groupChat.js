/**
 * routes/groupChat.js — Group Chat Feature (NEW)
 * Handles messages within a matched team pair.
 * Completely separate from existing /api/chat routes (1-to-1 chat untouched).
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { Team, TeamMatch, GroupMessage, User } = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isStudent }       = require('../middleware/roleMiddleware');

// ─── HELPER ───────────────────────────────────────────────────────
function isValidId(id) {
  return id && mongoose.Types.ObjectId.isValid(String(id));
}

/**
 * Verify caller is a member of a team that is part of an accepted TeamMatch.
 * Returns { matchDoc, senderTeam } or null.
 */
async function verifyGroupAccess(matchId, userId) {
  if (!isValidId(matchId)) return null;

  const matchDoc = await TeamMatch.findOne({ _id: matchId, status: 'accepted' });
  if (!matchDoc) return null;

  // Find the team of this user
  const senderTeam = await Team.findOne({
    _id: { $in: [matchDoc.team1_id, matchDoc.team2_id] },
    $or: [{ leader_id: userId }, { members: userId }],
  });

  if (!senderTeam) return null;
  return { matchDoc, senderTeam };
}

// ─── GET GROUP MESSAGES ───────────────────────────────────────────
// GET /api/group-chat/:matchId
// matchId = TeamMatch _id. Chat is identified by the match, not the team.
router.get('/:matchId', isAuthenticated, isStudent, async (req, res) => {
  const { matchId } = req.params;
  const userId      = req.session.user.id;

  try {
    const access = await verifyGroupAccess(matchId, userId);
    if (!access) {
      return res.json({ success: false, message: 'Access denied or match not accepted.' });
    }

    const messages = await GroupMessage.find({ group_id: matchId })
      .populate('sender_id', 'name')
      .sort({ timestamp: 1 })
      .lean();

    const result = messages.map(m => ({
      _id:         m._id.toString(),
      group_id:    m.group_id.toString(),
      sender_id:   m.sender_id._id.toString(),
      sender_name: m.sender_id.name,
      message:     m.message,
      timestamp:   m.timestamp,
      isMine:      m.sender_id._id.toString() === userId,
    }));

    res.json({ success: true, messages: result });
  } catch (err) {
    console.error('Group chat fetch error:', err);
    res.json({ success: false, message: 'Failed to load messages.' });
  }
});

// ─── SEND GROUP MESSAGE ───────────────────────────────────────────
// POST /api/group-chat/send
router.post('/send', isAuthenticated, isStudent, async (req, res) => {
  const { match_id, message } = req.body;
  const userId = req.session.user.id;

  if (!match_id || !message?.trim()) {
    return res.json({ success: false, message: 'match_id and message are required.' });
  }

  try {
    const access = await verifyGroupAccess(match_id, userId);
    if (!access) {
      return res.json({ success: false, message: 'Access denied or match not accepted.' });
    }

    await GroupMessage.create({
      group_id:  match_id,
      sender_id: userId,
      message:   message.trim(),
    });

    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    console.error('Group chat send error:', err);
    res.json({ success: false, message: 'Failed to send message.' });
  }
});

module.exports = router;
