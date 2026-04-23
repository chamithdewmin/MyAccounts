/**
 * Structured error with an HTTP status code.
 * Throw this in services/routes to produce a specific HTTP response
 * via the global errorHandler middleware.
 *
 * Usage:
 *   throw new AppError('Invoice not found', 404);
 *   throw new AppError('Validation failed', 400);
 */
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}
