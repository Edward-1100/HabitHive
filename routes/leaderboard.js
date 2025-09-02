const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    const topUsers = await User.find().sort({points: -1, username: 1})
    .limit(10).select("username points").lean();

    let currentUser = null;
    if (req.session && req.session.userId) {
      currentUser = await User.findById(req.session.userId)
        .select("username points").lean();
    }

    const highlightId = currentUser ? String(currentUser._id) : null;
    const inTop = highlightId ? topUsers.some(u => String(u._id) === highlightId) : false;

    let userRank = null;
    if (currentUser && !inTop) {
      userRank = await User.countDocuments({points: {$gt: currentUser.points}}) + 1;
    }

    res.render("leaderboard", {
      title: "Leaderboard",
      topUsers,
      currentUser,
      inTop,
      userRank,
      highlightId
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
  
});

module.exports = router;
