/**
 * routes/team.js — Group Matching Feature (NEW)
 * Handles team creation, joining, member invites, match suggestions,
 * and team match request/response.
 * Does NOT touch existing /api/match or /api/chat routes.
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { User, Team, TeamMatch } = require('../config/db');
const { isAuthenticated }       = require('../middleware/authMiddleware');
const { isStudent }             = require('../middleware/roleMiddleware');

// ─── HELPER ───────────────────────────────────────────────────────
function isValidId(id) {
  return id && mongoose.Types.ObjectId.isValid(String(id));
}

/** Returns the team the current user belongs to (as leader or member), or null. */
async function getMyTeam(userId) {
  return Team.findOne({
    $or: [{ leader_id: userId }, { members: userId }]
  });
}

// ═══════════════════════════════════════════════════════════════════
// TEAM CRUD
// ═══════════════════════════════════════════════════════════════════

// ─── CREATE TEAM ──────────────────────────────────────────────────
// POST /api/team/create
router.post('/create', isAuthenticated, isStudent, async (req, res) => {
  const { name, team_size, skills, availability } = req.body;
  const userId    = req.session.user.id;
  const college   = req.session.user.college_name;

  if (!name || !team_size) {
    return res.json({ success: false, message: 'Team name and size are required.' });
  }

  const size = Number(team_size);
  if (![2, 3, 4].includes(size)) {
    return res.json({ success: false, message: 'Team size must be 2, 3, or 4.' });
  }

  try {
    // Prevent duplicate membership
    const existing = await getMyTeam(userId);
    if (existing) {
      return res.json({ success: false, message: 'You are already in a team. Leave it first.' });
    }

    const team = await Team.create({
      name:         name.trim(),
      leader_id:    userId,
      members:      [userId],        // leader is also a member
      team_size:    size,
      skills:       skills || '',
      availability: availability || '',
      college_name: college,
    });

    res.json({ success: true, message: 'Team created!', team });
  } catch (err) {
    console.error('Team create error:', err);
    res.json({ success: false, message: 'Failed to create team.' });
  }
});

// ─── GET MY TEAM ──────────────────────────────────────────────────
// GET /api/team/my-team
router.get('/my-team', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const team = await Team.findOne({
      $or: [{ leader_id: userId }, { members: userId }]
    })
      .populate('leader_id', 'name email')
      .populate('members',   'name email skills availability')
      .lean();

    if (!team) return res.json({ success: true, team: null });

    // stringify ObjectIds for safe frontend use
    team._id       = team._id.toString();
    team.leader_id = { ...team.leader_id, _id: team.leader_id._id.toString() };
    team.members   = team.members.map(m => ({ ...m, _id: m._id.toString() }));

    res.json({ success: true, team });
  } catch (err) {
    console.error('My team error:', err);
    res.json({ success: false, message: 'Failed to fetch team.' });
  }
});

// ─── JOIN TEAM ────────────────────────────────────────────────────
// POST /api/team/join
router.post('/join', isAuthenticated, isStudent, async (req, res) => {
  const { team_id } = req.body;
  const userId  = req.session.user.id;
  const college = req.session.user.college_name;

  if (!isValidId(team_id)) return res.json({ success: false, message: 'Invalid team ID.' });

  try {
    const existing = await getMyTeam(userId);
    if (existing) return res.json({ success: false, message: 'You are already in a team.' });

    const team = await Team.findById(team_id);
    if (!team) return res.json({ success: false, message: 'Team not found.' });

    if (team.college_name !== college) {
      return res.json({ success: false, message: 'You can only join teams from your college.' });
    }

    if (team.members.length >= team.team_size) {
      return res.json({ success: false, message: 'Team is already full.' });
    }

    team.members.push(userId);
    await team.save();

    res.json({ success: true, message: 'Joined team successfully!' });
  } catch (err) {
    console.error('Join team error:', err);
    res.json({ success: false, message: 'Failed to join team.' });
  }
});

// ─── INVITE MEMBER BY EMAIL ───────────────────────────────────────
// POST /api/team/invite
router.post('/invite', isAuthenticated, isStudent, async (req, res) => {
  const { email } = req.body;
  const userId  = req.session.user.id;
  const college = req.session.user.college_name;

  if (!email) return res.json({ success: false, message: 'Email is required.' });

  try {
    // Only leader can invite
    const team = await Team.findOne({ leader_id: userId });
    if (!team) return res.json({ success: false, message: 'You are not a team leader.' });

    if (team.members.length >= team.team_size) {
      return res.json({ success: false, message: 'Team is already full.' });
    }

    // Find target user
    const target = await User.findOne({ email: email.toLowerCase(), college_name: college, role: 'student', is_blocked: false });
    if (!target) return res.json({ success: false, message: 'User not found in your college.' });

    // Check not already in a team
    const targetInTeam = await getMyTeam(target._id.toString());
    if (targetInTeam) return res.json({ success: false, message: 'This user is already in a team.' });

    // Check not already member
    if (team.members.map(String).includes(target._id.toString())) {
      return res.json({ success: false, message: 'User is already in your team.' });
    }

    team.members.push(target._id);
    await team.save();

    res.json({ success: true, message: `${target.name} added to your team!` });
  } catch (err) {
    console.error('Invite error:', err);
    res.json({ success: false, message: 'Failed to invite member.' });
  }
});

// ─── LEAVE TEAM ───────────────────────────────────────────────────
// POST /api/team/leave
router.post('/leave', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const team = await Team.findOne({
      $or: [{ leader_id: userId }, { members: userId }]
    });
    if (!team) return res.json({ success: false, message: 'You are not in a team.' });

    if (team.leader_id.toString() === userId) {
      // Leader disbands the team
      await Team.findByIdAndDelete(team._id);
      return res.json({ success: true, message: 'Team disbanded.' });
    }

    team.members = team.members.filter(m => m.toString() !== userId);
    await team.save();
    res.json({ success: true, message: 'Left team.' });
  } catch (err) {
    res.json({ success: false, message: 'Failed to leave team.' });
  }
});

// ─── TEAM SUGGESTIONS ─────────────────────────────────────────────
// GET /api/team/suggestions
// Returns same-college, same-size teams the user's team hasn't matched with yet.
router.get('/suggestions', isAuthenticated, isStudent, async (req, res) => {
  const userId  = req.session.user.id;
  const college = req.session.user.college_name;

  try {
    const myTeam = await getMyTeam(userId);
    if (!myTeam) return res.json({ success: false, message: 'You are not in a team yet.' });

    // Teams we already have a match with (either direction)
    const existingMatches = await TeamMatch.find({
      $or: [{ team1_id: myTeam._id }, { team2_id: myTeam._id }]
    }).lean();

    const excludedIds = new Set([myTeam._id.toString()]);
    existingMatches.forEach(m => {
      excludedIds.add(m.team1_id.toString());
      excludedIds.add(m.team2_id.toString());
    });

    const suggestions = await Team.find({
      _id:          { $nin: [...excludedIds].filter(isValidId).map(id => new mongoose.Types.ObjectId(id)) },
      college_name: college,
      team_size:    myTeam.team_size,
    })
      .populate('leader_id', 'name email')
      .populate('members',   'name')
      .lean();

    const result = suggestions.map(t => ({
      ...t,
      _id:       t._id.toString(),
      leader_id: { ...t.leader_id, _id: t.leader_id._id.toString() },
      members:   t.members.map(m => ({ ...m, _id: m._id.toString() })),
    }));

    res.json({ success: true, suggestions: result, myTeamId: myTeam._id.toString() });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.json({ success: false, message: 'Failed to load suggestions.' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// TEAM MATCH REQUESTS
// Mounted on same router — server.js maps /api/team-match → here via a
// second app.use. We use /match-* prefixes to avoid route collisions.
// ═══════════════════════════════════════════════════════════════════

// ─── SEND TEAM MATCH REQUEST ──────────────────────────────────────
// POST /api/team/match-request
router.post('/match-request', isAuthenticated, isStudent, async (req, res) => {
  const { target_team_id } = req.body;
  const userId = req.session.user.id;

  if (!isValidId(target_team_id)) return res.json({ success: false, message: 'Invalid team ID.' });

  try {
    const myTeam = await Team.findOne({ leader_id: userId });
    if (!myTeam) return res.json({ success: false, message: 'Only team leaders can send match requests.' });

    const targetTeam = await Team.findById(target_team_id);
    if (!targetTeam) return res.json({ success: false, message: 'Target team not found.' });

    if (myTeam.team_size !== targetTeam.team_size) {
      return res.json({ success: false, message: 'Teams must be the same size to match.' });
    }

    if (myTeam.college_name !== targetTeam.college_name) {
      return res.json({ success: false, message: 'Teams must be from the same college.' });
    }

    // Check no existing match between them
    const existing = await TeamMatch.findOne({
      $or: [
        { team1_id: myTeam._id, team2_id: target_team_id },
        { team1_id: target_team_id, team2_id: myTeam._id },
      ]
    });
    if (existing) return res.json({ success: false, message: 'Match request already exists.' });

    await TeamMatch.create({
      team1_id:   myTeam._id,
      team2_id:   target_team_id,
      created_by: userId,
    });

    res.json({ success: true, message: 'Team match request sent!' });
  } catch (err) {
    console.error('Team match request error:', err);
    res.json({ success: false, message: 'Failed to send match request.' });
  }
});

// ─── RESPOND TO TEAM MATCH REQUEST ───────────────────────────────
// PUT /api/team/match-respond/:id
router.put('/match-respond/:id', isAuthenticated, isStudent, async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const userId     = req.session.user.id;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.json({ success: false, message: 'Invalid status. Must be accepted or rejected.' });
  }
  if (!isValidId(id)) return res.json({ success: false, message: 'Invalid match ID.' });

  try {
    const matchReq = await TeamMatch.findById(id).populate('team2_id');
    if (!matchReq) return res.json({ success: false, message: 'Match request not found.' });

    // Only the receiving team's leader can respond
    const receivingTeam = await Team.findById(matchReq.team2_id);
    if (!receivingTeam || receivingTeam.leader_id.toString() !== userId) {
      return res.json({ success: false, message: 'Only the receiving team leader can respond.' });
    }

    matchReq.status = status;
    await matchReq.save();

    res.json({ success: true, message: `Match request ${status}.` });
  } catch (err) {
    console.error('Team match respond error:', err);
    res.json({ success: false, message: 'Failed to update match request.' });
  }
});

// ─── LIST TEAM MATCHES ────────────────────────────────────────────
// GET /api/team/match-list
router.get('/match-list', isAuthenticated, isStudent, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const myTeam = await getMyTeam(userId);
    if (!myTeam) return res.json({ success: true, matches: [] });

    const matches = await TeamMatch.find({
      $or: [{ team1_id: myTeam._id }, { team2_id: myTeam._id }]
    })
      .populate('team1_id', 'name team_size college_name members leader_id')
      .populate('team2_id', 'name team_size college_name members leader_id')
      .sort({ created_at: -1 })
      .lean();

    const result = matches.map(m => ({
      ...m,
      _id:      m._id.toString(),
      team1_id: { ...m.team1_id, _id: m.team1_id._id.toString() },
      team2_id: { ...m.team2_id, _id: m.team2_id._id.toString() },
      isReceiver: m.team2_id._id.toString() === myTeam._id.toString(),
      myTeamId: myTeam._id.toString(),
    }));

    res.json({ success: true, matches: result });
  } catch (err) {
    console.error('Match list error:', err);
    res.json({ success: false, message: 'Failed to fetch matches.' });
  }
});

module.exports = router;
