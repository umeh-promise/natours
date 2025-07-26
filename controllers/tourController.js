const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const httpStatusCodes = require('../utils/httpStatusCodes');
const handlers = require('./handlers');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.limit.sort = '-ratingAverage,price';
  req.query.limit.select = 'name,price,ratingAverage,summary,difficulty';

  next();
};

exports.getAllTours = handlers.getAll(Tour);
exports.getTour = handlers.getOne(Tour, { path: 'reviews' });
exports.createTour = handlers.createOne(Tour);
exports.updateTour = handlers.updateOne(Tour);
exports.deleteTour = handlers.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4.5 } } },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $sort: { avgPrice: -1 } },
    // { $match: { _id: { $ne: 'EASY' } } },
  ]);

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMontlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    { $addFields: { month: '$_id' } },
    { $project: { _id: 0 } },
    { $sort: { numTourStats: 1 } },
    { $limit: 12 },
  ]);
  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
