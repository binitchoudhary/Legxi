import { IPaymentGateway, PaymentGatewayResult } from '../../application/ports/IPaymentGateway';
import { AuctionRepositoryAdapter } from './AuctionRepositoryAdapter';
import { SettlementRepositoryAdapter } from './SettlementRepositoryAdapter';
import { ShopifyConfig } from '../config/ShopifyConfig';
import { logger } from '../../shared/logger';

export class ShopifyPaymentGateway implements IPaymentGateway {
  constructor(
    private readonly auctionRepo: AuctionRepositoryAdapter,
    private readonly settlementRepo: SettlementRepositoryAdapter
  ) {}

  async createPaymentSession(auctionId: string, amountPaise: string, userId: string): Promise<PaymentGatewayResult> {
    try {
      const auction = await this.auctionRepo.findById(auctionId);
      if (!auction) {
        throw new Error('Auction not found: ' + auctionId);
      }

      const settlement = await this.settlementRepo.findByAuctionId(auctionId);
      if (!settlement) {
        throw new Error('Settlement not found for auction: ' + auctionId);
      }

      const price = (parseInt(amountPaise, 10) / 100).toFixed(2);

      // --- Idempotency Check: Reuse existing Draft Order if safe ---
      if (settlement.providerReference && settlement.providerReference.provider === 'shopify' && settlement.providerReference.providerPaymentId) {
        const draftOrderId = settlement.providerReference.providerPaymentId;
        const getUrl = `https://${ShopifyConfig.storeDomain}/admin/api/${ShopifyConfig.apiVersion}/draft_orders/${draftOrderId}.json`;
        const getResponse = await fetch(getUrl, {
          headers: { 'X-Shopify-Access-Token': ShopifyConfig.adminToken }
        });
        
        if (getResponse.ok) {
          const data = await getResponse.json();
          const draftOrder = data.draft_order;
          
          // Safety guard 1: Is still unpaid/payable
          if (draftOrder.status === 'completed') {
            throw new Error('Safety guard: Unpaid status check failed. Existing Draft Order is completed.');
          }

          // Safety guard 2: Amount matches
          if (parseFloat(draftOrder.total_price).toFixed(2) !== price) {
            throw new Error(`Safety guard: Amount mismatch. Expected ${price}, found ${draftOrder.total_price}`);
          }

          // Safety guard 3: Currency matches
          if (draftOrder.currency !== 'INR') {
            throw new Error(`Safety guard: Currency mismatch. Expected INR, found ${draftOrder.currency}`);
          }

          // Safety guard 4: Valid invoice URL
          if (!draftOrder.invoice_url) {
            throw new Error('Safety guard: Existing Draft Order missing invoice_url.');
          }

          // Safety guard 5: Correlation metadata matches
          const notes = draftOrder.note_attributes || [];
          const sid = notes.find((n: any) => n.name === '_settlement_id')?.value;
          const aid = notes.find((n: any) => n.name === '_auction_id')?.value;
          const wid = notes.find((n: any) => n.name === '_winner_id')?.value;

          if (sid !== settlement.settlementId || aid !== auctionId || wid !== userId) {
            throw new Error('Safety guard: Correlation metadata mismatch on existing Draft Order.');
          }

          return {
            success: true,
            status: 'PENDING',
            paymentReference: draftOrder.invoice_url,
            providerReference: String(draftOrder.id)
          };
        }
        // If it fails to fetch, we don't automatically fall through. We fail explicitly.
        throw new Error(`Failed to fetch existing Draft Order for idempotency check: HTTP ${getResponse.status}`);
      }

      // --- New Draft Order Creation ---
      const shopifyProductId = auction.shopifyProductId;
      if (!shopifyProductId) {
        throw new Error('Auction does not have a linked shopifyProductId');
      }

      // Variant Resolution
      const productUrl = `https://${ShopifyConfig.storeDomain}/admin/api/${ShopifyConfig.apiVersion}/products/${shopifyProductId}.json?fields=variants`;
      const productResponse = await fetch(productUrl, {
        headers: { 'X-Shopify-Access-Token': ShopifyConfig.adminToken }
      });

      if (!productResponse.ok) {
        const errData = await productResponse.text();
        logger.error({ status: productResponse.status, errData }, 'Failed to fetch Shopify Product for variant resolution');
        return {
          success: false,
          status: 'FAILED',
          failureReason: `Product variant resolution failed: Shopify API returned ${productResponse.status}`
        };
      }

      const productData = await productResponse.json();
      const variants = productData.product?.variants;

      if (!variants || variants.length !== 1) {
        return {
          success: false,
          status: 'FAILED',
          failureReason: `Product variant resolution failed: Expected exactly 1 variant, but found ${variants ? variants.length : 0}`
        };
      }

      const variantId = variants[0].id;
      const catalogPriceStr = variants[0].price;
      if (!catalogPriceStr) {
        return {
          success: false,
          status: 'FAILED',
          failureReason: `Product variant resolution failed: Variant ${variantId} has no price`
        };
      }

      const catalogPricePaise = BigInt(Math.round(parseFloat(catalogPriceStr) * 100));
      const expectedAmountPaise = BigInt(amountPaise);

      if (expectedAmountPaise > catalogPricePaise) {
        return {
          success: false,
          status: 'FAILED',
          failureReason: 'Auction amount exceeds Shopify catalog price; pricing strategy requires explicit business approval.'
        };
      }

      const discountPaise = catalogPricePaise - expectedAmountPaise;
      const discountStr = (Number(discountPaise) / 100).toFixed(2);

      const draftOrderPayload: any = {
        draft_order: {
          line_items: [
            {
              variant_id: variantId,
              quantity: 1
            }
          ],
          note_attributes: [
            { name: "_settlement_id", value: settlement.settlementId },
            { name: "_auction_id", value: auction.id },
            { name: "_winner_id", value: userId }
          ],
          use_customer_default_address: true
        }
      };

      if (discountPaise > 0n) {
        draftOrderPayload.draft_order.applied_discount = {
          description: "Auction Winning Price Adjustment",
          value_type: "fixed_amount",
          value: discountStr,
          amount: discountStr
        };
      }

      const url = `https://${ShopifyConfig.storeDomain}/admin/api/${ShopifyConfig.apiVersion}/draft_orders.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ShopifyConfig.adminToken
        },
        body: JSON.stringify(draftOrderPayload)
      });

      if (!response.ok) {
        const errData = await response.text();
        logger.error({ status: response.status, errData }, 'Failed to create Shopify Draft Order');
        return {
          success: false,
          status: 'FAILED',
          failureReason: `Shopify API returned ${response.status}: ${errData}`
        };
      }

      const data = await response.json();
      const draftOrder = data.draft_order;

      // --- Post-Creation Verification Guard ---
      const actualTotal = parseFloat(draftOrder.total_price).toFixed(2);
      if (actualTotal !== price) {
        return {
          success: false,
          status: 'FAILED',
          failureReason: `Pricing Integrity Failure: Shopify Draft Order total (${actualTotal}) does not match expected authoritative amount (${price})`
        };
      }

      if (draftOrder.currency !== 'INR') {
        return {
          success: false,
          status: 'FAILED',
          failureReason: `Currency Integrity Failure: Shopify Draft Order currency is ${draftOrder.currency}, expected INR`
        };
      }

      const notes = draftOrder.note_attributes || [];
      const sid = notes.find((n: any) => n.name === '_settlement_id')?.value;
      const aid = notes.find((n: any) => n.name === '_auction_id')?.value;
      const wid = notes.find((n: any) => n.name === '_winner_id')?.value;

      if (sid !== settlement.settlementId || aid !== auctionId || wid !== userId) {
        return {
          success: false,
          status: 'FAILED',
          failureReason: 'Correlation Integrity Failure: Shopify Draft Order metadata does not match'
        };
      }

      return {
        success: true,
        status: 'PENDING',
        paymentReference: draftOrder.invoice_url,
        providerReference: String(draftOrder.id)
      };
    } catch (error: any) {
      logger.error(error, 'Error in ShopifyPaymentGateway.createPaymentSession');
      return {
        success: false,
        status: 'FAILED',
        failureReason: error.message
      };
    }
  }

  async verifyPayment(payload: any, signature: string, secret?: string): Promise<PaymentGatewayResult> {
    throw new Error('Unsupported Operation: Shopify orders/paid webhook is the authoritative source. Synchronous verification is not supported.');
  }

  async cancelPayment(auctionId: string): Promise<PaymentGatewayResult> {
    try {
      const settlement = await this.settlementRepo.findByAuctionId(auctionId);
      if (!settlement || !settlement.providerReference || settlement.providerReference.provider !== 'shopify') {
        return { success: false, status: 'FAILED', failureReason: 'No associated Shopify draft order found' };
      }

      const draftOrderId = settlement.providerReference.providerPaymentId;
      if (!draftOrderId) {
        return { success: false, status: 'FAILED', failureReason: 'Missing draft order ID' };
      }

      const getUrl = `https://${ShopifyConfig.storeDomain}/admin/api/${ShopifyConfig.apiVersion}/draft_orders/${draftOrderId}.json`;
      const getResponse = await fetch(getUrl, {
        headers: { 'X-Shopify-Access-Token': ShopifyConfig.adminToken }
      });

      if (!getResponse.ok) {
        if (getResponse.status === 404) {
          return { success: true, status: 'UNKNOWN', failureReason: 'Draft Order not found (already deleted)' };
        }
        return { success: false, status: 'FAILED', failureReason: 'Failed to fetch Draft Order state' };
      }

      const data = await getResponse.json();
      const draftOrder = data.draft_order;

      if (draftOrder.status === 'completed' || draftOrder.status === 'invoice_sent' && data.order_id) {
        return { success: false, status: 'FAILED', failureReason: 'Cannot cancel a Paid/Converted Shopify Order' };
      }

      const deleteUrl = `https://${ShopifyConfig.storeDomain}/admin/api/${ShopifyConfig.apiVersion}/draft_orders/${draftOrderId}.json`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'X-Shopify-Access-Token': ShopifyConfig.adminToken }
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        return { success: false, status: 'FAILED', failureReason: 'Failed to delete Draft Order' };
      }

      return { success: true, status: 'FAILED' };
    } catch (error: any) {
      logger.error(error, 'Error cancelling Shopify payment');
      return { success: false, status: 'FAILED', failureReason: error.message };
    }
  }
}
