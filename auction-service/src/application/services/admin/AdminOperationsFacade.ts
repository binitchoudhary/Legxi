import { AdminRetryService } from './AdminRetryService';
import { AdminStatusQueryService, AuctionDashboardView } from './AdminStatusQueryService';
import { AdminTimelineQueryService } from './AdminTimelineQueryService';
import { OperationalTimelineDTO } from '../../queries/models/OperationalViews';

export class AdminOperationsFacade {
  constructor(
    private readonly retryService: AdminRetryService,
    private readonly statusQueryService: AdminStatusQueryService,
    private readonly timelineQueryService: AdminTimelineQueryService
  ) {}

  public retryOwnershipTransfer(settlementId: string): Promise<void> {
    return this.retryService.retryOwnershipTransfer(settlementId);
  }

  public retryFailedNotification(notificationId: string): Promise<void> {
    return this.retryService.retryFailedNotification(notificationId);
  }

  public getAuctionDashboard(auctionId: string): Promise<AuctionDashboardView> {
    return this.statusQueryService.getAuctionDashboard(auctionId);
  }

  public getOperationalTimeline(auctionId: string): Promise<OperationalTimelineDTO> {
    return this.timelineQueryService.getOperationalTimeline(auctionId);
  }
}
