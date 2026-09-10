export interface ISettlementService {
  getSettlement(settlementId: string): Promise<any>;
  initiateSettlement(auctionId: string, winnerId: string): Promise<any>;
  recordPaymentAttempt(settlementId: string, provider: string, paymentId: string, eventId?: string): Promise<void>;
  markPaymentCaptured(settlementId: string): Promise<void>;
  markPaymentFailed(settlementId: string): Promise<void>;
  defaultSettlement(settlementId: string): Promise<void>;
  processPaymentWebhook(auctionId: string, payload: any, gatewayResult: { success: boolean, failureReason?: string }): Promise<void>;
}
