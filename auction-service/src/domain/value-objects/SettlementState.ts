export type AllowedSettlementState = 'READY' | 'NO_SETTLEMENT_REQUIRED' | 'REVIEW_REQUIRED';

/**
 * Value Object representing the evaluated settlement outcome.
 * This is a domain result, not a persistence status.
 */
export class SettlementState {
  constructor(private readonly state: AllowedSettlementState) {}

  public getValue(): AllowedSettlementState {
    return this.state;
  }

  public isReady(): boolean {
    return this.state === 'READY';
  }

  public isNoSettlementRequired(): boolean {
    return this.state === 'NO_SETTLEMENT_REQUIRED';
  }

  public isReviewRequired(): boolean {
    return this.state === 'REVIEW_REQUIRED';
  }
}
