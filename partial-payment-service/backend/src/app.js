import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestIdMiddleware } from './middleware/requestId.js';
import healthRouter from './routes/health.js';
import partialPaymentRouter from './routes/partialPayment.js';

// Initialize the Express app
const app = express();

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
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(requestIdMiddleware);

// API Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1/partial-payment', partialPaymentRouter);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', requestId: req.id });
});

export default app;
