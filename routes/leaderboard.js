const express = require("express");
const router = express.Router();
const User = require("../models/User");

function normalizePublicPath(p) {
  if (!p) return "/images/honeycomb.png";
  let s = String(p);
  s = s.replace(/^public[\\/]+/, "/");
  s = s.replace(/\\/g, "/");
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

router.get("/", async (req, res) => {
  try {
    const topUsersRaw = await User.find()
      .sort({points: -1})
      .limit(10)
      .select("username points profileImage")
      .lean();

    const topUsers = topUsersRaw.map(u => ({
      _id: u._id,
      username: u.username,
      points: typeof u.points === "number" ? u.points : (u.points || 0),
      profileImage: normalizePublicPath(u.profileImage)
    }));

    let currentUser = null;
    let userRank = null;
    const sessionUserId = (req.session && req.session.user && req.session.user.id) ? req.session.user.id : null;
    if (sessionUserId) {
      const cu = await User.findById(sessionUserId).select("username points profileImage").lean();
      if (cu) {
        currentUser = {
          _id: cu._id,
          username: cu.username,
          points: typeof cu.points === "number" ? cu.points : (cu.points || 0),
          profileImage: normalizePublicPath(cu.profileImage)
        };
        userRank = await User.countDocuments({points: {$gt: cu.points}}) + 1;
      }
    }

    res.render("leaderboard", {
      title: "Leaderboard",
      topUsers,
      currentUser,
      userRank
    });
  } catch (err) {
    console.error("Leaderboard route error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
