const express = require('express');
const router = express.Router();
const { Match, Message, User } = require('../config/db');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { isStudent } = require('../middleware/roleMiddleware');

// ─── SEND MESSAGE ─────────────────────────────────────────────────
router.post('/send', isAuthenticated, isStudent, async (req, res) => {
  const { receiver_id, message } = req.body;
  const sender_id = req.session.user.id;

  if (!receiver_id || !message?.trim()) {
    return res.json({ success: false, message: 'Receiver and message are required.' });
  }

  try {
    // Only allow chat between accepted connections
    const match = await Match.findOne({
      status: 'accepted',
      $or: [
        { sender_id, receiver_id },
        { sender_id: receiver_id, receiver_id: sender_id }
      ]
    });
    if (!match) return res.json({ success: false, message: 'You must be connected to chat.' });

    await Message.create({ sender_id, receiver_id, message: message.trim() });
    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    console.error('Chat send error:', err);
    res.json({ success: false, message: 'Failed to send message.' });
  }
});

// ─── GET CONVERSATION ─────────────────────────────────────────────
router.get('/conversation/:partnerId', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  const partnerId = req.params.partnerId;

  try {
    const messages = await Message.find({
      $or: [
        { sender_id: userId, receiver_id: partnerId },
        { sender_id: partnerId, receiver_id: userId }
      ]
    }).sort({ timestamp: 1 }).lean();

    const partner = await User.findById(partnerId)
      .select('name email college_name skills availability').lean();

    res.json({ success: true, messages, partner });
  } catch (err) {
    console.error('Conversation error:', err);
    res.json({ success: false, message: 'Failed to load conversation.' });
  }
});

// ─── GET ALL CONVERSATIONS (SIDEBAR) ─────────────────────────────
router.get('/conversations', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    // Find all unique partners the user has messaged
    const messages = await Message.find({
      $or: [{ sender_id: userId }, { receiver_id: userId }]
    }).sort({ timestamp: -1 }).lean();

    const partnerMap = new Map();
    for (const msg of messages) {
      const partnerId = msg.sender_id.toString() === userId
        ? msg.receiver_id.toString()
        : msg.sender_id.toString();
      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, { last_message: msg.message, last_time: msg.timestamp });
      }
    }

    const partnerIds = [...partnerMap.keys()];
    const users = await User.find({ _id: { $in: partnerIds } })
      .select('name email college_name').lean();

    const conversations = users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      college_name: u.college_name,
      ...partnerMap.get(u._id.toString())
    }));

    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Conversations error:', err);
    res.json({ success: false, message: 'Failed to load conversations.' });
  }
});

module.exports = router;
