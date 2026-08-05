import { IPaymentGateway, PaymentGatewayResult } from '../../application/ports/IPaymentGateway';
import { randomUUID } from 'crypto';

export class NoOpPaymentGateway implements IPaymentGateway {
  async createPaymentSession(auctionId: string, amountPaise: string, userId: string): Promise<PaymentGatewayResult> {
    return {
      success: true,
      status: 'PENDING',
      providerReference: `noop-txn-${randomUUID()}`
    };
  }

  async verifyPayment(payload: any, signature: string, secret?: string): Promise<PaymentGatewayResult> {
    // In production, signature verification and replay protection MUST occur here 
    // before translating the payload into a PaymentGatewayResult.
    
    // Simulate verification
    if (payload?.simulateFailure) {
      return { success: false, status: 'FAILED', failureReason: 'Simulated payment failure' };
    }
    
    return {
      success: true,
      status: 'SUCCESS',
      providerReference: payload?.transactionId || `noop-txn-${randomUUID()}`,
      gatewayEventId: payload?.eventId || `evt-${randomUUID()}`
    };
  }

  async cancelPayment(auctionId: string): Promise<PaymentGatewayResult> {
    return {
      success: true,
      status: 'UNKNOWN'
    };
  }
}
