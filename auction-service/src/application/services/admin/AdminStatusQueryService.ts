import { IAdminOperationalQueries } from '../../ports/IAdminOperationalQueries';
import { 
  AuctionOperationalView, 
  SettlementOperationalView, 
  TransferOperationalView, 
  NotificationOperationalView 
} from '../../queries/models/OperationalViews';

export interface AuctionDashboardView {
  auction: AuctionOperationalView | null;
  settlement: SettlementOperationalView | null;
  transfer: TransferOperationalView | null;
  notifications: NotificationOperationalView[];
}

export class AdminStatusQueryService {
  constructor(private readonly operationalQueries: IAdminOperationalQueries) {}

  public async getAuctionDashboard(auctionId: string): Promise<AuctionDashboardView> {
    const auction = await this.operationalQueries.getAuctionStatus(auctionId);
    const settlement = await this.operationalQueries.getSettlementStatus(auctionId);
    let transfer: TransferOperationalView | null = null;
    
    if (settlement?.settlementId) {
      transfer = await this.operationalQueries.getTransferStatus(settlement.settlementId);
    }
    
    const notifications = await this.operationalQueries.getNotificationStatuses(auctionId);

    return {
      auction,
      settlement,
      transfer,
      notifications
    };
  }
}
