/**
 * Global Error Handling Middleware for Express
 * Standardizes API error responses and logs stack traces in development.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 204 ? res.statusCode : 500);
  
  const response = {
    error: true,
    message: err.message || 'Erro interno no servidor',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  console.error(`❌ [API Error] ${req.method} ${req.originalUrl} - Status ${statusCode}:`, err.message);

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };
