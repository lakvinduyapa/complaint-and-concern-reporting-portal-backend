function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    details: error.details || undefined,
  });
}

module.exports = errorHandler;
