import { Router } from 'express';
import { verifySessionToken } from '../middleware/verifySessionToken.js';
import { createPaymentRateLimiter } from '../middleware/rateLimit.js';

import { createPartialPaymentController } from '../controllers/partialPaymentController.js';
import { createPartialPaymentService } from '../services/partialPaymentService.js';

import { attemptRepository } from '../repositories/attemptRepository.js';
import { rollbackRepository } from '../repositories/rollbackRepository.js';
import { createDraftOrderService } from '../shopify/draftOrder.js';
import { createOrderService } from '../shopify/order.js';
import { executeGraphQL } from '../shopify/client.js';

const router = Router();

// Wire up the dependency injection container
const draftOrderService = createDraftOrderService(executeGraphQL);
const orderService = createOrderService(executeGraphQL);

const partialPaymentService = createPartialPaymentService({
  attemptRepository,
  rollbackRepository,
  draftOrderService,
  orderService
});

const controller = createPartialPaymentController(partialPaymentService);

// POST /api/v1/partial-payment/create
router.post(
  '/create',
  verifySessionToken,         // 1. Authenticate & Authorize JWT
  createPaymentRateLimiter,   // 2. Rate limit (10 req/min/user)
  controller.create           // 3. Execute Business Logic
);

export default router;
