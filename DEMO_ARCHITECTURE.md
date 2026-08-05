# Phase 3.8.5 - Demo Architecture & Enterprise Constraints

This architecture document defines the exact boundaries, components, and enterprise constraints required to transform the LEGXI platform into a fully working demonstration environment while strictly preserving production business logic.

## 1. Application Services as Source of Truth
- **Constraint**: Raw Prisma inserts for Auctions, Bids, Payments, Settlements, and Transfers are strictly prohibited unless no application service exists.
- **Implementation**: The seeder operates at the Domain level, invoking `AdminService`, `BidService`, and `SettlementService`. All domain events (e.g., `AuctionCreated`, `BidPlaced`) will fire naturally.
- **Exceptions**: `AuditLog`, `OutboxEvent`, and `WebhookEvent` tables may use Prisma directly for cleanup/reset operations if no domain service exposes deletion, but creations must still flow through the application logic.

## 2. Development Identity Gateway (BFF)
- **Constraint**: The `auction-service` remains completely agnostic to authentication logic. No fake authentication will be added to the backend.
- **Implementation**: A **Development Identity Gateway** is implemented inside the Next.js BFF (`/api/auth/session` and `axios.ts` interceptors). 
- **Identities**: It provides deterministic demo identities: `Admin`, `Collector`, `VIP Collector`, `Operator`, `Guest`.
- **Injection**: It translates these development sessions into the exact `x-user-context` header expected by the production backend.
- **Safety**: No production JWTs are signed; it uses development-only session objects that perfectly mimic the gateway shape, allowing seamless replacement by the production gateway later.

## 3. Shopify Auto-Discovery
- **Constraint**: GIDs are never hardcoded.
- **Implementation**: During seeding and runtime, the BFF and seeder query active products from the production Shopify store.
- **Prioritization**: Products are selected deterministically favoring Signed collectibles -> Limited editions -> Heritage products -> Remaining active products.
- **Resolution**: The BFF resolves `title`, `vendor`, `image`, and `handle` securely without exposing the Shopify Admin token to the client.

## 4. Time-Traveling Idempotent Seeder
- **Constraint**: The seeder (`npm run seed-demo`) must be 100% idempotent, supporting `--reset`, `--append`, and `--clean` flags.
- **Execution**: To simulate time (e.g. ENDED auctions), the seeder injects a `MockTimeProvider` into the Application Services. 
- **Time Travel**: Timestamps are never manually manipulated in the DB. Instead, the clock is advanced programmatically (`timeProvider.advance(days)`), and natural lifecycle transitions (Draft -> Published -> Active -> Ended -> Settlement -> Transfer) are executed chronologically.
- **Bidding Stories**: Bids are not random. The seeder generates believable stories (Opening -> Early -> Competitive -> Sniping) for each auction.

## 5. Dashboard & Visual Quality
- **Constraint**: The application must never look empty or resemble a generic admin template.
- **Implementation**: Both Admin and Collector dashboards will be populated with meaningful components (Active/Upcoming/Ended/Settled queues, revenue, bid histories). 
- **Empty States**: If data is genuinely unavailable, premium components (e.g., "Upcoming Collections", "Trusted by Collectors") will replace blank white space. Raw IDs will never be shown to the user.

## 6. Live Verification & Reporting
- **Constraint**: A fully live browser recording must prove the platform's viability end-to-end.
- **Output**: 
  - `WORKING_PLATFORM_REPORT.md`
  - `DEMO_SEED_REPORT.md`
  - `PLAYWRIGHT_RUNTIME_REPORT.md` (Screenshots, API traces, logs).
