// Shared Shopify Admin API client (GraphQL + REST). Reads credentials from whichever
// process's environment imports this module — each service supplies its own via its own
// .env file, so this stays a pure, stateless client with no cross-service coupling.
const STORE   = process.env.SHOPIFY_STORE;
const TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VER = process.env.SHOPIFY_API_VERSION || '2025-10';
const BASE    = `https://${STORE}/admin/api/${API_VER}`;
const HDRS    = { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' };

export async function gql(query, variables = {}) {
  const res = await fetch(`${BASE}/graphql.json`, {
    method: 'POST', headers: HDRS, body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

export async function rest(path, method = 'GET', body = null) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: HDRS, body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
