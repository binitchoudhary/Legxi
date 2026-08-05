/**
 * LEGXI Resolver — Domain Errors
 */

export class AuctionResolverError extends Error {
  constructor(public code: string, message: string, public zerr?: unknown) {
    super(message);
    this.name = 'AuctionResolverError';
  }
}

export class AuctionValidationError extends AuctionResolverError {
  constructor(code: string, message: string, zerr?: unknown) {
    super(code, message, zerr);
    this.name = 'AuctionValidationError';
  }
}

export class AuctionTimeoutError extends AuctionResolverError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = 'AuctionTimeoutError';
  }
}

export class AuctionNetworkError extends AuctionResolverError {
  constructor(code: string, message: string, public status?: number) {
    super(code, message);
    this.name = 'AuctionNetworkError';
  }
}

export class AuctionPermissionError extends AuctionResolverError {
  constructor(code: string, message: string, public status?: number) {
    super(code, message);
    this.name = 'AuctionPermissionError';
  }
}
