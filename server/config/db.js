const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/syncitup';

// ─── CONNECTION ───────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════
// SCHEMAS & MODELS
// ══════════════════════════════════════════════════════════════════

// ─── USER ─────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },
  college_name:  { type: String, default: '' },
  skills:        { type: String, default: '' },
  interests:     { type: String, default: '' },
  availability:  { type: String, default: '' },
  bio:           { type: String, default: '' },
  role:          { type: String, enum: ['student', 'admin'], default: 'student' },
  is_blocked:    { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// ─── OTP VERIFICATION ─────────────────────────────────────────────
const otpSchema = new mongoose.Schema({
  email:       { type: String, required: true },
  otp:         { type: String, required: true },
  expiry_time: { type: Date, required: true },
  created_at:  { type: Date, default: Date.now },
});
// Auto-delete expired OTPs
otpSchema.index({ expiry_time: 1 }, { expireAfterSeconds: 0 });

// ─── MATCH ────────────────────────────────────────────────────────
const matchSchema = new mongoose.Schema({
  sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: { createdAt: 'created_at' } });

// ─── MESSAGE ──────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:     { type: String, required: true },
  timestamp:   { type: Date, default: Date.now },
});

// ─── REPORT ───────────────────────────────────────────────────────
const reportSchema = new mongoose.Schema({
  reported_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reported_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason:           { type: String, default: '' },
  last_messages:    { type: String, default: '[]' },  // JSON string
}, { timestamps: { createdAt: 'created_at' } });

// ─── TEAM ─────────────────────────────────────────────────────────
// NEW: Supports group matching feature. Completely separate from existing Match collection.
const teamSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  leader_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  team_size:    { type: Number, enum: [2, 3, 4], required: true },
  skills:       { type: String, default: '' },
  availability: { type: String, default: '' },
  college_name: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at' } });

// ─── TEAM MATCH ───────────────────────────────────────────────────
// NEW: Tracks match requests between teams. Does NOT affect individual Match collection.
const teamMatchSchema = new mongoose.Schema({
  team1_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  team2_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  status:     { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // leader who sent
}, { timestamps: { createdAt: 'created_at' } });

// ─── GROUP MESSAGE ────────────────────────────────────────────────
// NEW: Messages within a matched team chat. Separate from individual Message collection.
const groupMessageSchema = new mongoose.Schema({
  group_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMatch', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// ─── INVITE CODE ──────────────────────────────────────────────────
// NEW: Admin-generated codes required for registration (Feature 2).
const inviteCodeSchema = new mongoose.Schema({
  code:              { type: String, required: true, unique: true },
  created_by_admin:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usage_limit:       { type: Number, default: 1 },
  used_count:        { type: Number, default: 0 },
  expires_at:        { type: Date, required: true },
  active:            { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at' } });

// ─── EXPORT MODELS ────────────────────────────────────────────────
const User         = mongoose.model('User',         userSchema);
const OTP          = mongoose.model('OTP',          otpSchema);
const Match        = mongoose.model('Match',        matchSchema);
const Message      = mongoose.model('Message',      messageSchema);
const Report       = mongoose.model('Report',       reportSchema);
const Team         = mongoose.model('Team',         teamSchema);
const TeamMatch    = mongoose.model('TeamMatch',    teamMatchSchema);
const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);
const InviteCode   = mongoose.model('InviteCode',   inviteCodeSchema);

module.exports = { connectDB, User, OTP, Match, Message, Report, Team, TeamMatch, GroupMessage, InviteCode };
