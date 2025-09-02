const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Habit = require("../models/Habit");
const { ensureAdmin } = require("../middleware/auth");

router.get("/admin", ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().select("username email points isAdmin").lean();
    res.render("admin/dashboard", {users});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading admin panel");
  }
});

router.post("/admin/update-points/:id", ensureAdmin, async (req, res) => {
  try {
    const points = parseInt(req.body.points, 10);
    await User.findByIdAndUpdate(req.params.id, {points: isNaN(points) ? 0 : points});
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating points");
  }
});

router.post("/admin/toggle-admin/:id", ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {user.isAdmin = !user.isAdmin; await user.save();}
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating admin role");
  }
});

router.get("/admin/habits", ensureAdmin, async (req, res) => {
  try {
    const habits = await Habit.find().populate("user", "username email").lean();
    res.render("admin/habits", {habits});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading habits");
  }
});

router.post("/admin/habits/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await Habit.findByIdAndDelete(req.params.id);
    res.redirect("/admin/habits");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting habit");
  }
});

module.exports = router;
