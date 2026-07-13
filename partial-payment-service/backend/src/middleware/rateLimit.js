import rateLimit from 'express-rate-limit';

export const createPaymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP (or session) to 10 requests per `window` (here, per minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => {
    // If authenticated, limit by user (sub). Otherwise fallback to IP.
    return req.shopify ? req.shopify.userId : req.ip;
  },
  validate: false
});
