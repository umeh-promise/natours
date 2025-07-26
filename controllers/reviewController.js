const Review = require('../models/reviewModel');
const handlers = require('./handlers');

exports.getAllReviews = handlers.getAll(Review);

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.user.tour) req.body.user = req.user.id;
  next();
};

exports.getReview = handlers.getOne(Review);
exports.createReview = handlers.createOne(Review);
exports.updateReview = handlers.updateOne(Review);
exports.deleteReview = handlers.deleteOne(Review);
