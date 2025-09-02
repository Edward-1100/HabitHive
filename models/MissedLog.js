const mongoose = require("mongoose");

const MissedLogSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  habit: {type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true},
  date: {type: String, required: true}
}, {timestamps: true});

MissedLogSchema.index({habit: 1, date: 1}, {unique: true});

module.exports = mongoose.model("MissedLog", MissedLogSchema);
