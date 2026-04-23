/**
 * Global error handler — mounted as the LAST middleware in app.js.
 * All route catch blocks should call next(err) to reach here.
 */
export const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Server error';

  if (status >= 500) {
    console.error(`[${req.method} ${req.path}]`, err.message, err.stack?.split('\n')[1]?.trim() || '');
  }

  res.status(status).json({ error: message });
};
