/**
 * Domain-specific exceptions.
 * These errors represent violations of business rules and domain constraints.
 * They do not inherit from or know about infrastructure/HTTP error classes.
 */

export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidBidAmountError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_BID_AMOUNT');
  }
}

export class AuctionNotActiveError extends DomainError {
  constructor(message: string) {
    super(message, 'AUCTION_NOT_ACTIVE');
  }
}

export class AuctionClosedError extends DomainError {
  constructor(message: string) {
    super(message, 'AUCTION_CLOSED');
  }
}

export class ReservePriceNotMetError extends DomainError {
  constructor(message: string) {
    super(message, 'RESERVE_PRICE_NOT_MET');
  }
}

export class InvalidAuctionTimeWindowError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_AUCTION_TIME_WINDOW');
  }
}

export class InvalidAuctionStatusError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_AUCTION_STATUS');
  }
}

export class IdempotentIntentMismatchError extends DomainError {
  constructor(message: string) {
    super(message, 'IDEMPOTENT_INTENT_MISMATCH');
  }
}
