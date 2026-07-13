import { ENV } from './src/config/env.js';
import { executeGraphQL } from './src/shopify/client.js';
import { createOrderService, ShopifyUserError, OrderVerificationError } from './src/shopify/order.js';
import { createDraftOrderService } from './src/shopify/draftOrder.js';

console.log('\n--- Shopify Layer Tests ---\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

// Save original fetch
const originalFetch = global.fetch;

async function runTests() {
  try {
    // 1. DRY_RUN behavior
    ENV.DRY_RUN = true;
    const dryRunOrder = createOrderService(executeGraphQL);
    const simulated = await dryRunOrder.createOrder({}, 'test-req-id');
    assert(simulated.id === 'gid://shopify/Order/simulated', 'DRY_RUN behavior works');

    // Turn off DRY_RUN for remaining mock tests
    ENV.DRY_RUN = false;

    // 2. Successful GraphQL Execution
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'x-request-id': 'req-1' }),
      json: async () => ({
        data: {
          draftOrder: { id: 'gid://shopify/DraftOrder/1', status: 'OPEN', totalPriceSet: { shopMoney: { amount: '500', currencyCode: 'INR' } } }
        }
      })
    });
    const draftService = createDraftOrderService(executeGraphQL);
    const draft = await draftService.getDraftOrder('1', 'req-1');
    assert(draft.totalAmount === '500' && draft.currencyCode === 'INR', 'Successful GraphQL execution works');

    // 3. GraphQL userErrors
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'x-request-id': 'req-2' }),
      json: async () => ({
        data: {
          orderCreate: { userErrors: [{ field: ['id'], message: 'Invalid ID' }] }
        }
      })
    });
    const orderService = createOrderService(executeGraphQL);
    let threwUserError = false;
    try {
      await orderService.createOrder({}, 'req-2');
    } catch (err) {
      if (err instanceof ShopifyUserError) threwUserError = true;
    }
    assert(threwUserError, 'GraphQL userErrors parsed correctly');

    // 4. HTTP Failures (Non-transient)
    global.fetch = async () => ({
      ok: false,
      status: 400,
      headers: new Headers({ 'x-request-id': 'req-3' }),
      text: async () => 'Bad Request'
    });
    let threwHttpError = false;
    try {
      await executeGraphQL('query {}');
    } catch (err) {
      threwHttpError = true;
    }
    assert(threwHttpError, 'Non-transient HTTP failures handled properly');

    // 5. Retry Logic (Transient)
    let fetchCalls = 0;
    global.fetch = async () => {
      fetchCalls++;
      if (fetchCalls < 3) {
        return {
          ok: false,
          status: 503, // Transient
          headers: new Headers({ 'x-request-id': 'req-retry' }),
          text: async () => 'Service Unavailable'
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-request-id': 'req-ok' }),
        json: async () => ({ data: { success: true } })
      };
    };
    
    // We override the delay in the client during tests indirectly, 
    // but since we can't easily mock the internal sleep without mocking globals, 
    // we'll just let it sleep briefly (Base is 500ms, retry 1 is 500ms, retry 2 is 1000ms = ~1.5s total).
    console.log('Testing retry logic (will take ~1.5 seconds)...');
    const retryResult = await executeGraphQL('query {}');
    assert(fetchCalls === 3 && retryResult.data.success, 'Retry logic works (recovered on attempt 3)');

    // 6. Verification Success
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({}),
      json: async () => ({
        data: {
          order: {
            id: 'gid://shopify/Order/1',
            displayFinancialStatus: 'PARTIALLY_PAID',
            totalPriceSet: { shopMoney: { amount: '10000', currencyCode: 'INR' } },
            totalReceivedSet: { shopMoney: { amount: '1000', currencyCode: 'INR' } },
            totalOutstandingSet: { shopMoney: { amount: '9000', currencyCode: 'INR' } }
          }
        }
      })
    });
    const verificationSuccess = await orderService.verifyPartialPaymentOrder('1', '1000', '9000', '10000', 'INR', 'req-verify');
    assert(verificationSuccess, 'Verification success works');

    // 7. Verification Failure
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({}),
      json: async () => ({
        data: {
          order: {
            id: 'gid://shopify/Order/1',
            displayFinancialStatus: 'PAID', // Mismatch!
            totalPriceSet: { shopMoney: { amount: '10000', currencyCode: 'INR' } },
            totalReceivedSet: { shopMoney: { amount: '1000', currencyCode: 'INR' } },
            totalOutstandingSet: { shopMoney: { amount: '9000', currencyCode: 'INR' } }
          }
        }
      })
    });
    let verificationFailed = false;
    try {
      await orderService.verifyPartialPaymentOrder('1', '1000', '9000', '10000', 'INR', 'req-verify-fail');
    } catch (err) {
      if (err instanceof OrderVerificationError) verificationFailed = true;
    }
    assert(verificationFailed, 'Verification failure works (throws on mismatch)');

  } catch (err) {
    console.error('\nTests crashed:', err);
  } finally {
    global.fetch = originalFetch;
    console.log(`\nResults: ${passCount} Passed, ${failCount} Failed\n`);
    if (failCount > 0) process.exit(1);
    
    // Restore DRY_RUN for normal operations
    ENV.DRY_RUN = true;
  }
}

runTests();
