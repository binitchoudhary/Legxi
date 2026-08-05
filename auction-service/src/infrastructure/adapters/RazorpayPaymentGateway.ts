import { IPaymentGateway, PaymentGatewayResult } from '../../application/ports/IPaymentGateway';
import { RazorpayConfig } from '../config/RazorpayConfig';
import { createHmac } from 'crypto';

export class RazorpayPaymentGateway implements IPaymentGateway {
  constructor(private readonly config: RazorpayConfig) {}

  async createPaymentSession(auctionId: string, amountPaise: string, userId: string): Promise<PaymentGatewayResult> {
    // In a real implementation, this would invoke the Razorpay SDK to create an order.
    // For now, we simulate the structure of that SDK call.
    return {
      success: true,
      status: 'PENDING',
      providerReference: `order_${Date.now()}` // Simulated Razorpay order ID
    };
  }

  async verifyPayment(payload: any, signature: string, secret?: string): Promise<PaymentGatewayResult> {
    const activeSecret = secret || this.config.webhookSecret;
    
    // 1. Check missing signature
    if (!signature) {
      return { success: false, status: 'FAILED', failureReason: 'Missing signature header' };
    }

    // 2. Extract raw body (assume payload is stringified JSON for HMAC verification)
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // 3. Signature Verification
    try {
      const expectedSignature = createHmac('sha256', activeSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return { success: false, status: 'FAILED', failureReason: 'Invalid signature' };
      }
    } catch (error) {
      return { success: false, status: 'FAILED', failureReason: 'Malformed signature or invalid encoding' };
    }

    // 4. Parse payload if string
    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    // 5. Extract Provider specific fields
    const event = parsedPayload.event;
    const paymentEntity = parsedPayload.payload?.payment?.entity;
    
    if (!event || !paymentEntity) {
      return { success: false, status: 'UNKNOWN', failureReason: 'Unrecognized payload structure' };
    }

    // 6. Map to Generic Result
    let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' = 'UNKNOWN';
    if (event === 'payment.authorized' || event === 'payment.captured') {
      status = 'SUCCESS';
    } else if (event === 'payment.failed') {
      status = 'FAILED';
    }

    return {
      success: status === 'SUCCESS',
      status,
      providerReference: paymentEntity.order_id,
      paymentReference: paymentEntity.id,
      gatewayEventId: parsedPayload.id || `rzp-evt-${Date.now()}`,
      metadata: {
        method: paymentEntity.method,
        email: paymentEntity.email
      }
    };
  }

  async cancelPayment(auctionId: string): Promise<PaymentGatewayResult> {
    // Invoke Razorpay SDK to cancel if applicable, usually handled via timeouts
    return {
      success: true,
      status: 'UNKNOWN'
    };
  }
}
