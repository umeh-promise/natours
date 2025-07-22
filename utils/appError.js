class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // use this to mark all known errors operation i.e. differentiating errros

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
