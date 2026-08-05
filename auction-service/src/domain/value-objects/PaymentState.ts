export type AllowedPaymentState = 'NONE' | 'PAYMENT_PENDING' | 'PAYMENT_IN_PROGRESS' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PAYMENT_EXPIRED';

/**
 * Value Object representing the current payment lifecycle state of a winning bid.
 */
export class PaymentState {
  constructor(private readonly state: AllowedPaymentState) {}

  public getValue(): AllowedPaymentState {
    return this.state;
  }

  public isPending(): boolean {
    return this.state === 'PAYMENT_PENDING';
  }

  public isInProgress(): boolean {
    return this.state === 'PAYMENT_IN_PROGRESS';
  }

  public isSuccess(): boolean {
    return this.state === 'PAYMENT_SUCCESS';
  }

  public isFailed(): boolean {
    return this.state === 'PAYMENT_FAILED';
  }

  public isExpired(): boolean {
    return this.state === 'PAYMENT_EXPIRED';
  }
}
