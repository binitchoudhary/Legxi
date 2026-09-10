import { InvalidBidAmountError } from '../exceptions/DomainErrors';

/**
 * Immutable Value Object representing a monetary amount in paise (smallest currency unit).
 */
export class BidAmount {
  private readonly value: bigint;

  constructor(value: string | bigint | number) {
    try {
      this.value = BigInt(value);
    } catch {
      throw new InvalidBidAmountError('Bid amount must be a valid number');
    }

    if (this.value < 0n) {
      throw new InvalidBidAmountError('Bid amount cannot be negative');
    }
  }

  public getValue(): bigint {
    return this.value;
  }

  public toString(): string {
    return this.value.toString();
  }

  public isGreaterThan(other: BidAmount): boolean {
    return this.value > other.value;
  }

  public isGreaterThanOrEqual(other: BidAmount): boolean {
    return this.value >= other.value;
  }

  public add(other: BidAmount): BidAmount {
    return new BidAmount(this.value + other.value);
  }
  
  public subtract(other: BidAmount): BidAmount {
    return new BidAmount(this.value - other.value);
  }

  public equals(other: BidAmount): boolean {
    return this.value === other.value;
  }
}
