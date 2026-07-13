import { ENV } from '../config/env.js';
import { getLogger } from '../utils/logger.js';

const log = getLogger('shopify-client');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

// List of HTTP status codes considered transient
const TRANSIENT_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Generic Shopify GraphQL Client
 * Handles headers, transient retries, structured logging, and DRY_RUN simulation.
 */
export async function executeGraphQL(query, variables = {}, operationName = 'Unknown', reqId = 'system') {
  const reqLog = log.child({ requestId: reqId, operation: operationName });
  const url = `https://${ENV.SHOPIFY_STORE}/admin/api/${ENV.SHOPIFY_API_VERSION}/graphql.json`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': ENV.SHOPIFY_ADMIN_TOKEN,
  };

  const payload = {
    query,
    variables,
    operationName
  };

  if (ENV.DRY_RUN) {
    reqLog.info({ event: 'dry_run', payload }, 'DRY_RUN: Simulating Shopify GraphQL execution');
    return {
      simulated: true,
      data: null, // Specific modules will handle dry-run mocks
      errors: []
    };
  }

  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    attempt++;
    const startTime = Date.now();
    let response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Network failure (timeout, DNS, etc.)
      const duration = Date.now() - startTime;
      reqLog.warn({ event: 'network_failure', err: err.message, attempt, duration }, 'Shopify network failure');
      
      if (attempt > MAX_RETRIES) throw new Error(`Shopify network failure after ${MAX_RETRIES} retries: ${err.message}`);
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      continue;
    }

    const duration = Date.now() - startTime;
    const shopifyReqId = response.headers.get('x-request-id');
    const cost = response.headers.get('x-shopify-api-call-limit');

    const logContext = {
      event: 'shopify_response',
      attempt,
      duration,
      statusCode: response.status,
      shopifyRequestId: shopifyReqId,
      cost
    };

    if (response.ok) {
      const body = await response.json();
      reqLog.info(logContext, 'Shopify request successful');
      return body; // Return the standard { data, errors } format
    }

    // Handle HTTP errors
    if (TRANSIENT_STATUS_CODES.includes(response.status)) {
      reqLog.warn(logContext, `Transient Shopify error (${response.status})`);
      if (attempt > MAX_RETRIES) throw new Error(`Shopify API failed with status ${response.status} after ${MAX_RETRIES} retries.`);
      
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
      continue;
    }

    // Non-transient HTTP error (400, 401, 403, 404)
    const bodyText = await response.text();
    reqLog.error({ ...logContext, bodyText }, `Non-transient Shopify HTTP error (${response.status})`);
    throw new Error(`Shopify API non-transient failure: HTTP ${response.status}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
