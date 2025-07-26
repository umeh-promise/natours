const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const httpStatusCodes = require('../utils/httpStatusCodes');
const handlers = require('./handlers');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.getAllUsers = handlers.getAll(User);

exports.updateMe = catchAsync(async (req, res, next) => {
  // Return error when user wants to update the password
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password update. Please use the update-password route',
        httpStatusCodes.StatusBadRequest
      )
    );

  // filter out unwanted field names
  const filteredPayload = filterObj(req.body, 'name', 'email');

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredPayload,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(httpStatusCodes.StatusNoContent).json({
    status: 'success',
    message: 'Your account has been deleted',
  });
});

exports.getUser = handlers.getOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Please use signup instead',
  });
};

// Do not change password with this
exports.updateUser = handlers.updateOne(User);
exports.deleteUser = handlers.deleteOne(User);
