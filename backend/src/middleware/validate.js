/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure returns 400 with the first validation error message.
 *
 * Usage:
 *   import { validate } from '../middleware/validate.js';
 *   import { createClientSchema } from '../validators/clients.validator.js';
 *   router.post('/', validate(createClientSchema), handler);
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors[0]?.message || 'Validation error';
    return res.status(400).json({ error: message, details: result.error.errors });
  }
  req.body = result.data; // replace body with parsed/coerced values
  next();
};
