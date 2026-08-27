import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requestIdMiddleware } from './middleware/requestId.js';
import healthRouter from './routes/health.js';
import partialPaymentRouter from './routes/partialPayment.js';
import dashboardRouter from './routes/dashboard.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Express app
const app = express();
app.set('trust proxy', 1);


// Global Middleware
// 1. Security Headers (disables x-powered-by, etc.)
app.use(helmet());

// 2. Strict CORS (Only allow Admin Extension origin)
// Assuming extensions run inside admin.shopify.com. We can tighten this to exactly the shopify origin.
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https:\/\/[a-zA-Z0-9-]+\.myshopify\.com$/.test(origin) || 
        origin === 'https://admin.shopify.com' ||
        origin === 'https://extensions.shopifycdn.com') {
      return callback(null, true);
    }
    console.error(`[CORS Blocked] Origin not allowed: "${origin}"`);
    // Instead of throwing an error which causes a 500, we can just return false to let CORS middleware respond with 403.
    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder']
}));

app.use(express.json());
app.use(requestIdMiddleware);

// Rate Limiting (300 requests / 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1/partial-payment', apiLimiter, partialPaymentRouter);
app.use('/api/v1/dashboard', apiLimiter, dashboardRouter);

// Serve Static Frontend (Dashboard)
app.use(express.static(path.join(__dirname, '../public')));

// SPA Fallback for all non-API GET requests
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Basic API 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', requestId: req.id });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const reqId = req.id || 'unknown';
  console.error(`[${reqId}] Unhandled Express Error:`, err);
  
  // Do not leak stack traces to the client in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: isDev ? err.message : 'An unexpected error occurred while processing your request.',
    requestId: reqId
  });
});

export default app;
