import { SHOPIFY } from '../config/constants.js';

const MUTATION_DRAFT_ORDER_COMPLETE = `
  mutation draftOrderComplete($id: ID!, $paymentPending: Boolean!) {
    draftOrderComplete(id: $id, paymentPending: $paymentPending) {
      draftOrder {
        order {
          id
          name
          legacyResourceId
        }
      }
      userErrors { field message }
    }
  }
`;

const QUERY_ORDER_VERIFY = `
  query VerifyOrder($id: ID!) {
    order(id: $id) {
      id
      displayFinancialStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      totalReceivedSet { shopMoney { amount currencyCode } }
      totalOutstandingSet { shopMoney { amount currencyCode } }
    }
  }
`;

const MUTATION_ORDER_CANCEL = `
  mutation OrderCancel($orderId: ID!, $notifyCustomer: Boolean!, $reason: OrderCancelReason!, $refund: Boolean!, $restock: Boolean!) {
    orderCancel(orderId: $orderId, notifyCustomer: $notifyCustomer, reason: $reason, refund: $refund, restock: $restock) {
      orderCancelUserErrors { field message }
      job { id }
    }
  }
`;

const MUTATION_ORDER_CLOSE = `
  mutation OrderClose($input: OrderCloseInput!) {
    orderClose(input: $input) {
      order { id }
      userErrors { field message }
    }
  }
`;

export class ShopifyUserError extends Error {
  constructor(message, userErrors) {
    super(message);
    this.name = 'ShopifyUserError';
    this.userErrors = userErrors;
  }
}

export class OrderVerificationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'OrderVerificationError';
    this.details = details;
  }
}

export function createOrderService(graphqlClient) {
  return {
    async completeDraftOrder(draftOrderId, reqId) {
      const response = await graphqlClient(
        MUTATION_DRAFT_ORDER_COMPLETE,
        { id: draftOrderId, paymentPending: true },
        'draftOrderComplete',
        reqId
      );

      if (response.simulated) {
        return {
          id: 'gid://shopify/Order/simulated',
          name: '#SIMULATED',
          legacyResourceId: '123456789'
        };
      }

      if (response.errors && response.errors.length > 0) {
        throw new Error(`GraphQL Error: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const userErrors = response.data?.draftOrderComplete?.userErrors;
      if (userErrors && userErrors.length > 0) {
        throw new ShopifyUserError('Order creation failed due to user errors', userErrors);
      }

      return response.data?.draftOrderComplete?.draftOrder?.order;
    },

    async verifyPartialPaymentOrder(orderId, expectedAdvance, expectedRemaining, expectedTotal, expectedCurrency, reqId) {
      const response = await graphqlClient(
        QUERY_ORDER_VERIFY,
        { id: orderId },
        'VerifyOrder',
        reqId
      );

      if (response.simulated) {
        return true; // Assume success in DRY_RUN
      }

      if (response.errors && response.errors.length > 0) {
        throw new OrderVerificationError('GraphQL error during verification', { errors: response.errors });
      }

      const order = response.data?.order;
      if (!order) {
        throw new OrderVerificationError('Order not found or not retrievable immediately after creation', { orderId });
      }

      const status = order.displayFinancialStatus;
      const currency = order.totalPriceSet?.shopMoney?.currencyCode;
      const total = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
      const received = parseFloat(order.totalReceivedSet?.shopMoney?.amount || 0);
      const outstanding = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || 0);

      const expAdvanceNum = parseFloat(expectedAdvance);
      const expRemainingNum = parseFloat(expectedRemaining);
      const expTotalNum = parseFloat(expectedTotal);

      const mismatches = [];

      if (status !== 'PARTIALLY_PAID') mismatches.push(`Status is ${status}, expected PARTIALLY_PAID`);
      if (currency !== expectedCurrency) mismatches.push(`Currency is ${currency}, expected ${expectedCurrency}`);
      if (Math.abs(total - expTotalNum) > 0.01) mismatches.push(`Total is ${total}, expected ${expTotalNum}`);
      if (Math.abs(received - expAdvanceNum) > 0.01) mismatches.push(`Received is ${received}, expected ${expAdvanceNum}`);
      if (Math.abs(outstanding - expRemainingNum) > 0.01) mismatches.push(`Outstanding is ${outstanding}, expected ${expRemainingNum}`);

      if (mismatches.length > 0) {
        throw new OrderVerificationError('Order failed mathematical/status verification', { mismatches, orderId });
      }

      return true;
    },

    async cancelOrder(orderId, reqId) {
      const response = await graphqlClient(
        MUTATION_ORDER_CANCEL,
        { orderId, notifyCustomer: false, reason: 'OTHER', refund: false, restock: false },
        SHOPIFY.OPERATIONS.ORDER_CANCEL,
        reqId
      );

      if (response.simulated) return true;

      const userErrors = response.data?.orderCancel?.orderCancelUserErrors;
      if (userErrors && userErrors.length > 0) {
        throw new ShopifyUserError('Order cancel failed', userErrors);
      }
      return true;
    },

    async closeOrder(orderId, reqId) {
      const response = await graphqlClient(
        MUTATION_ORDER_CLOSE,
        { input: { id: orderId } },
        SHOPIFY.OPERATIONS.ORDER_CLOSE,
        reqId
      );

      if (response.simulated) return true;

      const userErrors = response.data?.orderClose?.userErrors;
      if (userErrors && userErrors.length > 0) {
        throw new ShopifyUserError('Order close failed', userErrors);
      }
      return true;
    }
  };
}
