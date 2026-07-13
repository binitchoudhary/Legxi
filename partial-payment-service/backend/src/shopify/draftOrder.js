import { SHOPIFY } from '../config/constants.js';

const QUERY_DRAFT_ORDER = `
  query GetDraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      status
      totalPriceSet {
        shopMoney { amount currencyCode }
      }
      customer {
        id
      }
      order {
        id
        displayFinancialStatus
      }
    }
  }
`;

const MUTATION_DRAFT_ORDER_UPDATE = `
  mutation draftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
    draftOrderUpdate(id: $id, input: $input) {
      draftOrder {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export function createDraftOrderService(graphqlClient) {
  return {
    async getDraftOrder(draftOrderId, reqId) {
      const response = await graphqlClient(
        QUERY_DRAFT_ORDER,
        { id: draftOrderId },
        SHOPIFY.OPERATIONS.GET_DRAFT_ORDER,
        reqId
      );

      if (response.simulated) {
        return {
          id: draftOrderId,
          status: 'OPEN',
          totalAmount: '10000.00',
          currencyCode: 'INR',
          customerId: 'gid://shopify/Customer/123',
          existingOrderId: null,
          existingOrderStatus: null
        };
      }

      if (response.errors && response.errors.length > 0) {
        throw new Error(`GraphQL Error: ${response.errors.map(e => e.message).join(', ')}`);
      }

      const draft = response.data?.draftOrder;
      if (!draft) return null;

      return {
        id: draft.id,
        status: draft.status,
        totalAmount: draft.totalPriceSet?.shopMoney?.amount,
        currencyCode: draft.totalPriceSet?.shopMoney?.currencyCode,
        customerId: draft.customer?.id || null,
        existingOrderId: draft.order?.id || null,
        existingOrderStatus: draft.order?.displayFinancialStatus || null
      };
    },

    async updateDraftOrderAttributes(draftOrderId, attributes, reqId) {
      const numericId = draftOrderId.split('/').pop();
      const url = `https://${process.env.SHOPIFY_STORE}/admin/api/${process.env.SHOPIFY_API_VERSION}/draft_orders/${numericId}.json`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN
        },
        body: JSON.stringify({
          draft_order: {
            id: numericId,
            note_attributes: attributes.map(a => ({ name: a.key, value: a.value })),
            tags: `advance_payment_${attributes.find(a => a.key === 'advance_payment_amount')?.value || '0'}`
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`REST Error during draft update: ${errText}`);
      }

      return true;
    }
  };
}
