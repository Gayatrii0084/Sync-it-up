/**
 * SyncItUp – Database Seeder
 * Run with: npm run seed
 *
 * Creates demo admin + student accounts for testing.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/syncitup';

// ─── SCHEMA (inline, matches db.js) ──────────────────────────────
const userSchema = new mongoose.Schema({
  name:         String,
  email:        { type: String, unique: true, lowercase: true },
  password:     String,
  college_name: String,
  skills:       String,
  interests:    String,
  availability: String,
  bio:          String,
  role:         { type: String, default: 'student' },
  is_blocked:   { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at' } });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ─── DEMO ACCOUNTS ────────────────────────────────────────────────
const COLLEGE = 'PESMCOE';

const demoUsers = [
  {
    name: 'Admin User',
    email: 'admin@pesmcoe.com',
    password: 'Admin@1234',
    college_name: COLLEGE,
    skills: 'Management, Administration',
    interests: 'Hackathons, Events',
    availability: 'full-time',
    bio: 'College admin for SyncItUp.',
    role: 'admin',
  },
  {
    name: 'Gayatri Jaydeokar',
    email: 'gayatri@pesmcoe.com',
    password: 'Student@1234',
    college_name: COLLEGE,
    skills: 'Frontend, MERN Stack, UI UX',
    interests: 'Hackathons, Seminars, Open Source',
    availability: 'full-time',
    bio: 'Passionate frontend developer who loves building beautiful UIs and participating in hackathons.',
  },
  {
    name: 'Rahul Sharma',
    email: 'rahul@pesmcoe.com',
    password: 'Student@1234',
    college_name: COLLEGE,
    skills: 'Backend, Node.js, MongoDB',
    interests: 'Hackathons, Web Development, APIs',
    availability: 'part-time',
    bio: 'Backend engineer with a love for building scalable REST APIs.',
  },
  {
    name: 'Priya Mehta',
    email: 'priya@pesmcoe.com',
    password: 'Student@1234',
    college_name: COLLEGE,
    skills: 'AI, ML, Python, Data Science',
    interests: 'Machine Learning, Research, Hackathons',
    availability: 'weekends',
    bio: 'ML enthusiast exploring deep learning and computer vision.',
  },
  {
    name: 'Arjun Patil',
    email: 'arjun@pesmcoe.com',
    password: 'Student@1234',
    college_name: COLLEGE,
    skills: 'Mobile Development, React Native, Flutter',
    interests: 'App Development, Startups, Hackathons',
    availability: 'full-time',
    bio: 'Mobile developer building cross-platform apps. Love turning ideas into apps.',
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha@pesmcoe.com',
    password: 'Student@1234',
    college_name: COLLEGE,
    skills: 'Cybersecurity, Networking, Linux',
    interests: 'CTF Competitions, Ethical Hacking, Hackathons',
    availability: 'weekends',
    bio: 'Cybersecurity enthusiast. CTF player. Bug bounty hunter.',
  },
  {
    name: 'Dev Nair',
    email: 'dev@pesmcoe.com',
    password: 'Student@1234',
    college_name: COLLEGE,
    skills: 'IoT, Embedded Systems, Arduino, Raspberry Pi',
    interests: 'Hardware, Robotics, Hackathons',
    availability: 'part-time',
    bio: 'IoT developer who loves blending hardware with software.',
  },
];

// ─── SEED ─────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 SyncItUp Database Seeder\n');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  let created = 0;
  let skipped = 0;

  for (const userData of demoUsers) {
    const exists = await User.findOne({ email: userData.email });
    if (exists) {
      console.log(`⏭️  Skipped  : ${userData.email} (already exists)`);
      skipped++;
      continue;
    }
    const hashed = await bcrypt.hash(userData.password, 12);
    await User.create({ ...userData, password: hashed });
    console.log(`✅ Created  : ${userData.email}  [${userData.role || 'student'}]`);
    created++;
  }

  console.log(`\n📊 Done! Created: ${created} | Skipped: ${skipped}`);
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  DEMO LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════');
  console.log('  👑 Admin:');
  console.log('     Email    : admin@pesmcoe.com');
  console.log('     Password : Admin@1234');
  console.log('\n  🎓 Students (all use password: Student@1234)');
  console.log('     gayatri@pesmcoe.com   – Frontend, MERN Stack');
  console.log('     rahul@pesmcoe.com     – Backend, Node.js');
  console.log('     priya@pesmcoe.com     – AI, ML, Python');
  console.log('     arjun@pesmcoe.com     – Mobile Development');
  console.log('     sneha@pesmcoe.com     – Cybersecurity');
  console.log('     dev@pesmcoe.com       – IoT, Embedded');
  console.log('═══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
