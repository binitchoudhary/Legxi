import { BidDTO } from '../../api/dto/bid.dto';
import { AuctionDTO } from '../../api/dto/auction.dto';
import { Auction, AuctionStatus, AuctionTimeWindow, BidAmount, Bid } from '../../domain';

export class DomainMapper {
  public static toDomainAuction(dto: AuctionDTO): Auction {
    return new Auction(
      dto.id,
      dto.shopifyProductId,
      new AuctionTimeWindow(new Date(dto.startTime), new Date(dto.endTime)),
      new AuctionStatus(dto.status),
      new BidAmount(dto.startingPricePaise),
      new BidAmount(dto.currentPricePaise),
      new BidAmount(dto.minIncrementPaise),
      dto.reservePricePaise ? new BidAmount(dto.reservePricePaise) : null,
      dto.winningBidId,
      dto.version,
      dto.extensionCount || 0,
      dto.extensionDurationSec || 0,
      dto.extensionThresholdSec || 0,
      dto.maxExtensions || 0
    );
  }

  public static toDomainBid(dto: BidDTO): Bid {
    return new Bid(
      dto.id,
      dto.auctionId,
      dto.userId,
      new BidAmount(dto.amountPaise),
      dto.isProxy,
      new Date(dto.createdAt)
    );
  }
}

