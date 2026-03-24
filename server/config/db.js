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

// ─── EXPORT MODELS ────────────────────────────────────────────────
const User    = mongoose.model('User',    userSchema);
const OTP     = mongoose.model('OTP',     otpSchema);
const Match   = mongoose.model('Match',   matchSchema);
const Message = mongoose.model('Message', messageSchema);
const Report  = mongoose.model('Report',  reportSchema);

module.exports = { connectDB, User, OTP, Match, Message, Report };
