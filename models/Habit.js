const mongoose = require("mongoose");

const HabitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ["good", "bad"], required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  progress: [
    {
      date: { type: Date, required: true },
      completed: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Habit", HabitSchema);
