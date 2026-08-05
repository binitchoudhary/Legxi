import { IAuctionRepository } from '../ports/IAuctionRepository';
import { IUserService, UserProfileDto } from '../ports/IUserService';

export class TransferRequestFactory {
  constructor(
    private readonly auctionRepo: IAuctionRepository,
    private readonly userService: IUserService
  ) {}

  public async buildCreatePayload(auctionId: string, winnerId: string): Promise<Record<string, any>> {
    const { auction, user } = await this.resolveDependencies(auctionId, winnerId);

    return {
      certificate_id: auction.shopifyProductId, // In this domain, shopifyProductId aligns with certificate_id
      edition_number: '', // Can be extended later
      product_title: `Auction Won - ${auction.id}`,
      edition_type: 'Auction Winner',
      order_id: '', // Empty as this is an internal settlement, not a Shopify checkout order
      owner_name: user.name,
      owner_phone: user.phone,
      owner_email: user.email
    };
  }

  public async buildUpdatePayload(auctionId: string, winnerId: string): Promise<Record<string, any>> {
    const { user } = await this.resolveDependencies(auctionId, winnerId);

    return {
      action: 'edit',
      fields: {
        current_owner_name: user.name,
        current_owner_phone: user.phone,
        current_owner_email: user.email,
        transfer_status: 'active', // Forces activation upon assignment
        transfer_reason: 'Auction Won',
        pending_to_name: '',
        pending_to_phone: '',
        pending_to_email: '',
        pending_order_id: ''
      }
    };
  }

  public async getHandleAndPhone(auctionId: string, winnerId: string): Promise<{ handle: string, phone: string }> {
    const { auction, user } = await this.resolveDependencies(auctionId, winnerId);
    // Mimics the 'buildHandle' logic from the external transfer-service (often just certificate_id lowercase)
    // Assuming certificate_id = shopifyProductId.
    const handle = String(auction.shopifyProductId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return { handle, phone: user.phone };
  }

  private async resolveDependencies(auctionId: string, winnerId: string) {
    const auction = await this.auctionRepo.findById(auctionId);
    if (!auction) throw new Error(`Auction ${auctionId} not found`);

    const user = await this.userService.getUserProfile(winnerId);
    if (!user) throw new Error(`User ${winnerId} not found`);

    return { auction, user };
  }
}
