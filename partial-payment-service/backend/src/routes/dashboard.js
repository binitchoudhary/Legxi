import { Router } from 'express';
import { verifySessionToken } from '../middleware/verifySessionToken.js';
import { dashboardController } from '../controllers/dashboardController.js';

const router = Router();

// Apply Shopify session token verification to all dashboard routes
router.use(verifySessionToken);

router.get('/metrics', dashboardController.getMetrics);
router.get('/transactions', dashboardController.getTransactions);
router.get('/attempts', dashboardController.getAttempts);
router.get('/health', dashboardController.getHealth);

export default router;
