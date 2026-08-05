export class PaymentProviderReference {
  constructor(
    public readonly provider: string,
    public readonly providerPaymentId: string,
    public readonly providerEventId?: string
  ) {}

  public equals(other: PaymentProviderReference): boolean {
    return (
      this.provider === other.provider &&
      this.providerPaymentId === other.providerPaymentId &&
      this.providerEventId === other.providerEventId
    );
  }
}
