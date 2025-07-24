const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    min: [2, 'Name must be greater than 2 characters'],
  },
  email: {
    type: String,
    requirec: [true, 'Email is required'],
    validate: [validator.isEmail, 'Email must be valid'],
    unique: true,
    lowercase: true,
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Password is required'],
    validate: {
      // This only works for SAVE AND CREATE
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords does not match',
    },
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
