const AppError = require('../utils/appError');
const httpStatusCodes = require('../utils/httpStatusCodes');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;

  return new AppError(message, httpStatusCodes.StatusBadRequest);
};

const handleDuplicateFieldDB = (err) => {
  const message = `Duplicate field value: (${err.keyValue.name}). Please use another value`;

  return new AppError(message, httpStatusCodes.StatusBadRequest);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((err) => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, httpStatusCodes.StatusBadRequest);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operation, trusted errors: send to the client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or unknown errors: don't send to the client
  } else {
    //Log the error
    console.log('ERROR', err);

    // Send generic message
    res.status(httpStatusCodes.StatusInternalServerError).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || httpStatusCodes.StatusInternalServerError;
  err.status = err.status || 'error';

  const nodeEnv = process.env.NODE_ENV.trim();

  if (nodeEnv === 'development') {
    sendErrorDev(err, res);
  } else if (nodeEnv === 'production') {
    let error = { ...err, name: err.name, message: err.message };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'MongoError') error = handleDuplicateFieldDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(err);
    sendErrorProd(error, res);
  }

  next();
};
