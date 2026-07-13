import { ValidationError, DuplicateRequestError, ConcurrentRequestError, BusinessRuleError } from '../services/errors.js';
import { OrderVerificationError } from '../shopify/order.js';
import { getLogger } from '../utils/logger.js';

export function createPartialPaymentController(partialPaymentService) {
  return {
    async create(req, res) {
      const reqId = req.id;
      const log = getLogger(reqId);
      const payload = req.body;

      try {
        log.info({ event: 'controller_start', payload }, 'Processing partial payment request');
        
        const result = await partialPaymentService.processAdvancePayment(payload, reqId);
        
        log.info({ event: 'controller_success', attemptId: result.idempotencyKey }, 'Partial payment processed successfully');
        res.status(200).json({ success: true, data: result });
        
      } catch (err) {
        if (err instanceof ValidationError) {
          log.warn({ event: 'controller_error', type: 'ValidationError', message: err.message });
          return res.status(400).json({ error: err.message, type: 'ValidationError' });
        }
        
        if (err instanceof DuplicateRequestError) {
          log.warn({ event: 'controller_error', type: 'DuplicateRequestError', message: err.message });
          return res.status(409).json({ error: err.message, type: 'DuplicateRequestError' });
        }
        
        if (err instanceof ConcurrentRequestError) {
          log.warn({ event: 'controller_error', type: 'ConcurrentRequestError', message: err.message });
          return res.status(409).json({ error: err.message, type: 'ConcurrentRequestError' });
        }
        
        if (err instanceof BusinessRuleError) {
          log.warn({ event: 'controller_error', type: 'BusinessRuleError', message: err.message });
          return res.status(422).json({ error: err.message, type: 'BusinessRuleError' });
        }

        if (err instanceof OrderVerificationError) {
          log.error({ event: 'controller_error', type: 'OrderVerificationError', message: err.message, details: err.details });
          return res.status(422).json({ error: 'Order created but failed verification. Rollback triggered.', type: 'OrderVerificationError' });
        }
        
        // ShopifyUserError is typically wrapped in Verification or Rollback, but just in case
        if (err.name === 'ShopifyUserError') {
          log.error({ event: 'controller_error', type: 'ShopifyUserError', message: err.message, errors: err.userErrors });
          return res.status(422).json({ error: 'Shopify rejected the request', type: 'ShopifyUserError', details: err.userErrors });
        }

        log.error({ event: 'controller_error', type: 'InternalServerError', err }, 'Unhandled internal error');
        res.status(500).json({ error: err.message, stack: err.stack, type: 'InternalServerError' });
      }
    }
  };
}
