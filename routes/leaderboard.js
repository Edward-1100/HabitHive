const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Habit = require("../models/Habit");

function normalizePublicPath(p) {
  if (!p) return "/images/honeycomb.png";
  let s = String(p);
  s = s.replace(/^public[\\/]+/, "/");
  s = s.replace(/\\/g, "/");
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

function toIso(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampDateToDayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function progressEntryToIso(p) {
  if (!p) return null;
  if (typeof p === "string") return p;
  if (p instanceof Date) return toIso(p);
  if (p.date) {
    if (typeof p.date === "string") return p.date;
    return toIso(new Date(p.date));
  }
  return null;
}

function computeCurrentStreak(habits) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxLookbackDays = 4000;
  let currentStreak = 0;

  for (let i = 0; i < maxLookbackDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toIso(d);

    let scheduled = 0;
    let completed = 0;

    for (const h of habits) {
      const start = clampDateToDayStart(h.startDate || new Date());
      const end = h.endDate ? clampDateToDayStart(h.endDate) : null;
      if (d >= start && (!end || d <= end)) {
        scheduled++;
        if (Array.isArray(h.progress)) {
          const p = h.progress.find(pp => progressEntryToIso(pp) === iso);
          if (p && p.completed) completed++;
        }
      }
    }

    if (scheduled === 0) {
      continue;
    }

    if (completed === scheduled) {
      currentStreak++;
    } else {
      break;
    }
  }

  return currentStreak;
}

router.get("/", async (req, res) => {
  try {
    const mode = (req.query.mode === "streak") ? "streak" : "points";

    const usersRaw = await User.find()
      .select("username points profileImage createdAt")
      .lean();

    const userIds = usersRaw.map(u => String(u._id));
    const habits = await Habit.find({user: {$in: userIds}}).lean();

    const habitsByUser = {};
    for (const h of habits) {
      const k = String(h.user);
      if (!habitsByUser[k]) habitsByUser[k] = [];
      habitsByUser[k].push(h);
    }

    const usersWithStats = usersRaw.map(u => {
      const uid = String(u._id);
      const uHabits = habitsByUser[uid] || [];
      const streak = computeCurrentStreak(uHabits);
      return {
        _id: u._id,
        username: u.username,
        points: typeof u.points === "number" ? u.points : (u.points || 0),
        profileImage: normalizePublicPath(u.profileImage),
        streak
      };
    });

    let sorted;
    if (mode === "streak") {
      sorted = usersWithStats.sort((a, b) => {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.points - a.points;
      });
    } else {
      sorted = usersWithStats.sort((a, b) => b.points - a.points);
    }

    const topUsers = sorted.slice(0, 10);

    let currentUser = null;
    let userRank = null;
    const sessionUserId = (req.session && req.session.user && req.session.user.id) ? String(req.session.user.id) : null;
    if (sessionUserId) {
      const cu = usersWithStats.find(u => String(u._id) === sessionUserId);
      if (cu) {
        currentUser = cu;
        if (mode === "streak") {
          userRank = usersWithStats.filter(u => u.streak > cu.streak || (u.streak === cu.streak && u.points > cu.points)).length + 1;
        } else {
          userRank = usersWithStats.filter(u => u.points > cu.points).length + 1;
        }
      }
    }

    res.render("leaderboard", {
      title: "Leaderboard",
      topUsers,
      currentUser,
      userRank,
      mode
    });
  } catch (err) {
    console.error("Leaderboard route error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
