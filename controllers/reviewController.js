const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const httpStatusCodes = require('../utils/httpStatusCodes');

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find();

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    data: {
      reviews,
    },
  });
});
exports.createReview = catchAsync(async (req, res, next) => {
  const { review, rating, tour } = req.body;
  const newReview = await Review.create({
    review,
    rating,
    tour,
    user: req.user.id,
  });

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
});
