const { promisify } = require('util');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');
const httpStatusCodes = require('../utils/httpStatusCodes');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV.trim() === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // Remove the password and active fields from the output
  user.password = undefined;
  user.active = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, passwordChangedAt } =
    req.body;
  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
    passwordChangedAt,
  });

  createSendToken(newUser, httpStatusCodes.StatusCreated, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(
      new AppError(
        'Please provide email or password!',
        httpStatusCodes.StatusBadRequest
      )
    );

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(
      new AppError(
        'Invalid email or password!',
        httpStatusCodes.StatusUnauthorized
      )
    );

  createSendToken(user, httpStatusCodes.StatusOK, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1.  Get the token and check if it's there
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer'))
    return next(
      new AppError(
        'Authorization Header missing or malfunctioned',
        httpStatusCodes.StatusUnauthorized
      )
    );

  const token = authorizationHeader.split(' ')[1];

  if (!token)
    return next(
      new AppError(
        'You are not logged in. Please login to get access',
        httpStatusCodes.StatusUnauthorized
      )
    );

  // 2. Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError(
        'The user belonging to the token does not exist',
        httpStatusCodes.StatusUnauthorized
      )
    );

  // 4. Check if the user changed password after the token was issues
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError(
        'User recently changed password. Please login again',
        httpStatusCodes.StatusUnauthorized
      )
    );

  // GRANT ACCESS TO THE PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError(
          'You do not permission to perform this action',
          httpStatusCodes.StatusForbidden
        )
      );

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(
      new AppError(
        "There's no user with this email address",
        httpStatusCodes.StatusNotFound
      )
    );

  // 2. Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send it back as an email
  const resetURL = `${req.protocol}//${req.get(
    'host'
  )}/api/v1/users/reset-password/${resetToken}`;

  const message = `Forgot your password? Use the Reset endpoint (${resetURL}) and pass the token as a path parameter.\n If you did not request this, then please ignore`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10min)',
      message,
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later',
        httpStatusCodes.StatusInternalServerError
      )
    );
  }

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    message: 'Token sent your email',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gte: Date.now() },
  });

  // If token has not expired, and there's a user set the new password.
  if (!user)
    return next(
      new AppError(
        'Token is invalid or has expired ',
        httpStatusCodes.StatusBadRequest
      )
    );

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Update the changedPasswordAt property of the user -(check the userModel)
  // Log the user in
  createSendToken(user, httpStatusCodes.StatusOK, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // Get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  // Check if the POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(
      new AppError('Incorrect password', httpStatusCodes.StatusUnauthorized)
    );

  // Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // Log user in, send JWT
  createSendToken(user, httpStatusCodes.StatusOK, res);
});
