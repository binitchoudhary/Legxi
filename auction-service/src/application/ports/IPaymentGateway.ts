export type GatewayPaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN';

export interface PaymentGatewayResult {
  success: boolean;
  status: GatewayPaymentStatus;
  providerReference?: string;
  paymentReference?: string;
  gatewayEventId?: string;
  processedAt?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface IPaymentGateway {
  createPaymentSession(auctionId: string, amountPaise: string, userId: string): Promise<PaymentGatewayResult>;
  verifyPayment(payload: any, signature: string, secret?: string): Promise<PaymentGatewayResult>;
  cancelPayment(auctionId: string): Promise<PaymentGatewayResult>;
}
