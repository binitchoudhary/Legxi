import { getLogger } from '../utils/logger.js';

export const BUSINESS_EVENTS = {
  ATTEMPT_CREATED: 'ATTEMPT_CREATED',
  DRAFT_VALIDATED: 'DRAFT_VALIDATED',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_VERIFIED: 'ORDER_VERIFIED',
  ROLLBACK_STARTED: 'ROLLBACK_STARTED',
  ROLLBACK_COMPLETED: 'ROLLBACK_COMPLETED',
  ATTEMPT_FAILED: 'ATTEMPT_FAILED',
  SUCCESS: 'SUCCESS'
};

export const eventBus = {
  emit(event, context) {
    const { requestId, attemptId, draftOrderId, orderId, duration, ...details } = context;
    const log = getLogger(requestId);
    
    log.info({
      businessEvent: event,
      attemptId,
      draftOrderId,
      orderId,
      duration,
      timestamp: new Date().toISOString(),
      ...details
    }, `Business Event: ${event}`);
  }
};
