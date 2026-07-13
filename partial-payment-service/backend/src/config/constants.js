/**
 * Application Constants
 */
export const SHOPIFY = {
  OPERATIONS: {
    GET_DRAFT_ORDER: 'GetDraftOrder',
    ORDER_CREATE: 'OrderCreate',
    ORDER_UPDATE_NOTE: 'OrderUpdateNote',
    ORDER_CANCEL: 'OrderCancel',
    ORDER_CLOSE: 'OrderClose'
  }
};

export const PAYMENT = {
  SUPPORTED_CURRENCIES: ['INR'],
  MAX_NOTE_LENGTH: 500,
  VALID_MODES: ['Cash', 'UPI', 'Bank Transfer', 'Razorpay', 'Other']
};
