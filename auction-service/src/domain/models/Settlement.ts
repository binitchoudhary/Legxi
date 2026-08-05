import { PaymentProviderReference } from '../value-objects/PaymentProviderReference';

export type SettlementStatus = 'INITIATED' | 'COMPLETED' | 'DEFAULTED';
export type PaymentState = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED';

export class Settlement {
  constructor(
    public readonly settlementId: string,
    public readonly auctionId: string,
    public readonly winnerId: string,
    public paymentState: PaymentState,
    public settlementStatus: SettlementStatus,
    public readonly paymentWindowOpenedAt: Date,
    public paymentAttempts: number,
    public providerReference: PaymentProviderReference | null,
    public version: number
  ) {}

  public recordPaymentAttempt(providerRef: PaymentProviderReference): void {
    if (this.settlementStatus !== 'INITIATED') {
      throw new Error('Settlement is no longer active.');
    }
    this.paymentAttempts++;
    this.providerReference = providerRef;
    this.paymentState = 'PENDING';
  }

  public authorizePayment(): void {
    if (this.settlementStatus !== 'INITIATED') return;
    this.paymentState = 'AUTHORIZED';
  }

  public capturePayment(): void {
    if (this.settlementStatus !== 'INITIATED') return;
    this.paymentState = 'CAPTURED';
    this.settlementStatus = 'COMPLETED';
  }

  public failPayment(): void {
    if (this.settlementStatus !== 'INITIATED') return;
    this.paymentState = 'FAILED';
  }

  public defaultSettlement(): void {
    this.settlementStatus = 'DEFAULTED';
    this.paymentState = 'FAILED';
  }
}
