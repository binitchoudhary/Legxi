# POC: Native "Partially Paid" order on Shopify Grow

Pure Node.js, no frameworks, GraphQL Admin API only (REST was not needed — every operation
required for this test, including archive via `orderClose`, has a GraphQL mutation).

## What was NOT done

I did **not** execute any of these scripts. The only Shopify store credentials available in
this project point at the real, live LEGXI production store (`5ci887-xv.myshopify.com`,
confirmed via a read-only API check: `shop.name = "LEGXI"`, `partnerDevelopment: false`).
There is no separate Shopify Partner development/sandbox store available here, and per your
instruction the test orders should not be created against production. So every outcome
described in these files' comments is **a documented expectation from Shopify's own API
reference, not a verified result** — running the scripts yourself against a real dev store
is what turns "expected" into "confirmed."

Two facts I *did* verify with a real, read-only API call against that store (safe, no side
effects, no order created): the token has `write_orders` scope, and `shop.plan.displayName`
returns `"Shopify"` — likely the legacy internal name for the plan marketed today as "Grow",
worth reconfirming on whichever store you actually run this against.

## Files

| File | Purpose |
|---|---|
| `approach-a.mjs` | draftOrderCreate → draftOrderComplete(paymentPending) → orderCreateManualPayment(₹1,000) |
| `approach-b.mjs` | orderCreate directly, with a ₹1,000 SALE transaction embedded against a ₹10,000 order |
| `verify-order.mjs` | Queries an order's financial status, paid amount, outstanding balance, transactions, timeline events, and Admin URL |
| `cleanup-order.mjs` | orderCancel → orderDelete (best-effort) → orderClose (archive fallback if delete fails) |

## Setup

1. Point a `.env` file at whichever store you're testing against:
   ```
   SHOPIFY_STORE=your-dev-store.myshopify.com
   SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SHOPIFY_API_VERSION=2025-10
   ```
2. Token scopes needed: `write_draft_orders`, `write_orders`.
3. Run from this folder with the parent project's `node_modules` (has `dotenv` already), or
   run `npm install dotenv` here directly.

## Run order

```
node approach-a.mjs
node verify-order.mjs "<order id printed above>"

node approach-b.mjs
node verify-order.mjs "<order id printed above>"

node cleanup-order.mjs "<order id from approach-a>"
node cleanup-order.mjs "<order id from approach-b>"
```

## What each script prints

Every script prints, for every mutation it sends: the full GraphQL mutation text, the full
variables object, the full raw HTTP response body, any top-level GraphQL `errors`, and every
entry in any `userErrors` array — nothing is summarized or swallowed.

- **`approach-a.mjs` step 3** (`orderCreateManualPayment`): per Shopify's docs, the `amount`
  input field carries this exact sentence — *"The API client must be installed on a Shopify
  Plus store to use the amount field."* On a non-Plus store, expect a `userError` here.
- **`approach-b.mjs` step 1** (`orderCreate` with `transactions`): no Plus restriction is
  documented on this input. If `displayFinancialStatus` comes back `PARTIALLY_PAID` with
  `totalOutstandingSet = 9000.00`, that's the workaround path for Grow-plan stores.
- **`verify-order.mjs`** prints Financial Status, Paid Amount, Outstanding Balance,
  every transaction, every timeline event, and a direct Admin URL
  (`https://<store>/admin/orders/<legacyResourceId>`) — open that URL in a browser to
  visually confirm the **Send Invoice** / **Mark as Paid** buttons, since those are native
  Admin UI driven by financial status and are not returned by any API field.
  - Note: GraphQL only exposes one status field, `displayFinancialStatus` — there is no
    separate `financialStatus` field on the modern Order object (confirmed directly against
    Shopify's schema docs), so "Financial Status" and "Display Financial Status" in the
    output are the same value printed twice, not two independent data points.
- **`cleanup-order.mjs`** always cancels first, then tries to delete, and only if delete is
  rejected does it archive (`orderClose`) as a fallback — so a test order never lingers as
  an un-archived cancelled order in your default Orders view.
