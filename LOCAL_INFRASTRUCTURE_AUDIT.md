# Local Infrastructure Audit

## 1. Repository Startup Procedure
The current official local development startup procedure is incomplete. There is no `docker-compose.yml`, `docker-compose.yaml`, or official `README.md` defining the local infrastructure scaffolding.

**Expected Procedure:**
1. Populate `.env` in `auction-service` (currently defaults to `localhost:5432` for PG and `localhost:6379` for Redis).
2. Start infrastructure (Currently undefined/missing).
3. `npm run dev` in `auction-service`.
4. `npm run dev` in `auction-frontend`.

## 2. Service Requirements

### Required Services
1. **PostgreSQL**: Absolutely required. The `.env` expects a connection at `localhost:5432`. `auction-service` relies on it for all data persistence via Prisma.
2. **Redis**: Absolutely required. The `src/redis/index.ts` and `PubSubManager` hardcode connections to Redis for WebSocket publishing/subscribing and distributed caching. There are no flags (`REDIS_ENABLED`, `MOCK_REDIS`) to bypass this requirement or fall back to an in-memory substitute.

### Optional Services
- **Firebase Emulator**: Not strictly required for the backend boot sequence. The `.env` contains dummy Firebase Admin SDK credentials, meaning authentication can be bypassed or mocked locally without the official Firebase auth emulator.

## 3. Verified Assumptions
- **Redis Dependency:** It is confirmed that Redis is a hard requirement. The backend will crash into a persistent `ECONNREFUSED` loop if Redis is absent.
- **Prisma 7 Configuration:** The `schema.prisma` intentionally drops the `url` property as dictated by Prisma 7 preview mode. I have reverted my previous `@prisma/adapter-pg` modifications. The repository currently lacks the explicit adapter wiring required to run this Prisma version natively against local Postgres, meaning the intended architecture relies either on Prisma Accelerate or the migration to the driver adapter was left incomplete by the backend team.
- **Frontend Hydration Warning:** The hydration mismatch (`cz-shortcut-listen="true"`) is strictly an artifact of local browser extensions (e.g., ColorZilla) manipulating the DOM before React hydrates. The codebase itself is sound. I have reverted the `suppressHydrationWarning` on the `<body>` element so legitimate application-level hydration errors will not be masked.

## 4. Rejected Assumptions
- **Local Scaffolding Exists:** The assumption that the repository provides a `docker-compose.yml` for local development is rejected. Developers are currently expected to manually provision their own local databases or connect to staging.
- **Docker is Functioning:** The assumption that Docker can be utilized immediately is rejected. The host machine's BIOS has hardware virtualization disabled, preventing the Docker Engine from starting.

## 5. Infrastructure Blockers
1. **Host Virtualization Disabled:** Docker Desktop cannot boot its Linux VM, preventing any containerized Postgres/Redis instances from running locally.
2. **Missing Compose File:** Even if virtualization were enabled, the repository lacks a `docker-compose.yml` to standardize the local environment topology.
3. **Prisma 7 Initialization:** The backend codebase lacks the final adapter wiring to connect Prisma 7 directly to a local PostgreSQL instance without Accelerate.

## 6. Recommended Developer Setup
Before commencing Phase 3.8, the following local infrastructure standards should be applied:
1. **BIOS Intervention:** The host machine must be rebooted to enable Hardware Virtualization (VT-x/AMD-V).
2. **Standardize Scaffolding:** Commit a `docker-compose.yml` to the repository root containing a `postgres:16` and `redis:7` service.
3. **Finalize Database Driver:** Make a definitive architectural decision on Prisma 7 (either complete the `@prisma/adapter-pg` integration in `src/database/index.ts` or downgrade Prisma to v5.x where `schema.prisma` natively supports connection URLs).
