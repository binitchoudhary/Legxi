export class RoomNamingStrategy {
  static getAuctionRoom(auctionId: string): string {
    return `auction:${auctionId}`;
  }

  static getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  static getAdminRoom(): string {
    return `admin`;
  }
}
