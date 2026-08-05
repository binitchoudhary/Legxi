import {
  AuctionOperationalView,
  SettlementOperationalView,
  TransferOperationalView,
  NotificationOperationalView
} from '../queries/models/OperationalViews';

export interface IAdminOperationalQueries {
  getAuctionStatus(auctionId: string): Promise<AuctionOperationalView | null>;
  getSettlementStatus(auctionId: string): Promise<SettlementOperationalView | null>;
  getSettlementStatusById(settlementId: string): Promise<SettlementOperationalView | null>;
  getTransferStatus(settlementId: string): Promise<TransferOperationalView | null>;
  getNotificationStatuses(auctionId: string): Promise<NotificationOperationalView[]>;
}
