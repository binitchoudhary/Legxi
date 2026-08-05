# Database Audit Report
**Date**: 2026-08-01
**Target**: `auction` database (PostgreSQL) inside Docker

## 1. Users & Roles
**Observation**: The Prisma schema in `auction-service` does NOT contain `User` or `Role` tables.
**Analysis**: The `auction-service` is designed as a downstream microservice. It relies entirely on an API Gateway or Backend-For-Frontend (BFF) to authenticate users and inject identity via the `x-user-context` HTTP header (as seen in `src/modules/auth/middleware/authenticate.ts`). Local development currently lacks this Gateway, causing the "Unauthorized" errors when bypassing it.

## 2. Auctions
**Count**: 0
**Details**: The `auctions` table is completely empty.

## 3. Linked Shopify Products
**Count**: 0
**Details**: No products are currently referenced as there are no auctions in the database.

## 4. Bids
**Count**: 0
**Details**: The `bids` table is completely empty.

## 5. Settlements
**Count**: 0
**Details**: The `settlements` table is completely empty.

## Conclusion
The local database is entirely empty. To make the platform demonstrable, we must seed the database with real auctions referencing actual Shopify products, and bypass or mock the API Gateway layer to inject the required `x-user-context` header for authentication.
