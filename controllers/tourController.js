const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
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

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/300/center/6.54871440513649, 3.388788148951097/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radiusOfEarthInMiles = 3963.2;
  const radiusOfEarthInKm = 6378.1;

  const radius =
    unit === 'mi'
      ? distance / radiusOfEarthInMiles
      : distance / radiusOfEarthInKm;

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide a lattitude and longitude with the format like lat,lng'
      )
    );

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng)
    return next(
      new AppError(
        'Please provide a lattitude and longitude with the format like lat,lng'
      )
    );

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
        distanceField: 'distance',
        distanceMultiplier: 0.001,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(httpStatusCodes.StatusOK).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
