export interface OwnershipTransferRequested {
  type: 'OwnershipTransferRequested';
  payload: {
    settlementId: string;
    auctionId: string;
    winnerId: string;
    correlationId: string;
    requestedAt: string;
  };
}

export interface OwnershipTransferred {
  type: 'OwnershipTransferred';
  payload: {
    settlementId: string;
    auctionId: string;
    winnerId: string;
    correlationId: string;
    transferredAt: string;
  };
}

export interface OwnershipTransferFailed {
  type: 'OwnershipTransferFailed';
  payload: {
    settlementId: string;
    auctionId: string;
    winnerId: string;
    correlationId: string;
    reason: string;
    failedAt: string;
  };
}
