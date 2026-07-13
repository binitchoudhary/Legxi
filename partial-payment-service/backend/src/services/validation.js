import { PAYMENT } from '../config/constants.js';
import { ValidationError, BusinessRuleError } from './errors.js';

export const validationService = {
  validateInput(payload) {
    const { idempotencyKey, draftOrderId, advanceAmount, currency, paymentMode } = payload;
    
    if (!idempotencyKey) throw new ValidationError('idempotencyKey is required');
    if (!draftOrderId || !draftOrderId.startsWith('gid://shopify/DraftOrder/')) {
      throw new ValidationError('Valid draftOrderId is required (gid://shopify/DraftOrder/...)');
    }
    
    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('advanceAmount must be a positive number');
    }
    
    if (!PAYMENT.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new ValidationError(`Currency ${currency} is not supported`);
    }
    
    if (!PAYMENT.VALID_MODES.includes(paymentMode)) {
      throw new ValidationError(`Payment mode ${paymentMode} is not supported`);
    }
    
    if (payload.staffNote && payload.staffNote.length > PAYMENT.MAX_NOTE_LENGTH) {
      throw new ValidationError(`staffNote exceeds maximum length of ${PAYMENT.MAX_NOTE_LENGTH}`);
    }
  },

  validateBusinessRules(draft, advanceAmount, currency) {
    if (!draft) throw new BusinessRuleError('Draft order not found');
    
    if (draft.status !== 'OPEN' && draft.status !== 'INVOICE_SENT') {
      throw new BusinessRuleError(`Draft order status must be OPEN, but is ${draft.status}`);
    }
    
    if (draft.existingOrderId) {
      throw new BusinessRuleError(`Draft order already completed (Order ID: ${draft.existingOrderId})`);
    }
    
    if (!draft.customerId) {
      throw new BusinessRuleError('Customer must be attached to the Draft Order');
    }
    
    if (draft.currencyCode !== currency) {
      throw new BusinessRuleError(`Currency mismatch: Draft is ${draft.currencyCode}, requested is ${currency}`);
    }
    
    const total = parseFloat(draft.totalAmount);
    const advance = parseFloat(advanceAmount);
    
    if (advance >= total) {
      throw new BusinessRuleError(`Advance amount (${advance}) must be strictly less than order total (${total})`);
    }

    return { totalAmount: total, remainingAmount: total - advance };
  }
};
