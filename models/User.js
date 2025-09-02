const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {type: String, unique: true, required: true, trim: true},
  password: {type: String, required: true},
  email: {type: String, unique: true, required: true, trim: true, lowercase: true},
  points: {type: Number, default: 0},
  isAdmin: {type: Boolean, default: false},
  profileImage: {type: String, default: '/images/honeycomb.png'}
}, {timestamps: true});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

UserSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
