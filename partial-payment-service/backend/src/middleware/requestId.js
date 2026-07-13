import { v4 as uuidv4 } from 'uuid';

/**
 * Global Request ID Middleware
 * Generates a unique UUID for every incoming request.
 * Attaches it to the req object for logging, and sets the X-Request-ID header in the response.
 */
export function requestIdMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
}
