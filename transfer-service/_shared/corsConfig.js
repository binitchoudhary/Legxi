// Identical CORS origin-parsing logic used by both services today (previously copy-pasted).
export function buildCorsOptions(allowedOriginsEnv) {
  const origins = (allowedOriginsEnv || '*').split(',').map(o => o.trim()).filter(Boolean);
  return {
    origin: (origin, cb) => {
      if (!origin || origins.includes('*') || origins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
    credentials: true,
  };
}
