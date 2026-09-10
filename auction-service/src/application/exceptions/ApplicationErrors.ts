import { AppError } from '../../shared/errors';

export class AuctionNotFoundError extends AppError {
  constructor(auctionId: string) {
    super(`Auction ${auctionId} not found`, 404, 'AUCTION_NOT_FOUND');
  }
}

export class AuctionNotActiveError extends AppError {
  constructor(auctionId: string, currentStatus: string) {
    super(`Auction ${auctionId} is not active. Current status: ${currentStatus}`, 400, 'AUCTION_NOT_ACTIVE');
  }
}

export class InvalidBidAmountError extends AppError {
  constructor(message: string) {
    super(message, 400, 'INVALID_BID_AMOUNT');
  }
}

export class InvalidAuctionTimeError extends AppError {
  constructor(message: string) {
    super(message, 400, 'INVALID_AUCTION_TIME');
  }
}

export class ConcurrencyConflictError extends AppError {
  constructor(message: string = 'Due to high volume, your request could not be processed. Please try again.') {
    // 409 Conflict Maps to ConflictError fundamentally
    super(message, 409, 'CONCURRENCY_CONFLICT');
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message: string) {
    super(message, 400, 'INVALID_STATE_TRANSITION');
  }
}
