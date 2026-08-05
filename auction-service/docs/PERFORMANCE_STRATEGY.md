# Performance Validation Strategy

## 1. Load Scenarios
- **Auction Creation Load**: Validates write-heavy IO against PostgreSQL. (Target: 100 req/s sustained).
- **Concurrent Bid Load**: High concurrency and write-contention validation. Ensures `AuctionEngine` policies process correctly without deadlocking. (Target: 5,000 bids/sec per auction, 50k active WebSocket connections).
- **Settlement Burst**: Evaluates event-driven throughput when 1000s of auctions close simultaneously and trigger `SettlementCreated` events.
- **Notification Burst**: Downstream pressure simulation. (Target: 10,000 events/sec sent to Kafka/Notification Service).
- **Transfer Burst**: Evaluates rate-limiting and connection pooling against `transfer-service` during massive ownership handovers.
- **Analytics/Admin Load**: Read-heavy replica IO load. Ensures complex aggregations do not starve operational connections.

## 2. SLOs (Service Level Objectives)
- **Bid Acceptance Latency (99th percentile)**: < 50ms
- **WebSocket Fan-out Latency (99th percentile)**: < 100ms
- **Settlement Initiation Latency**: < 5s after Auction close.

## 3. Bottleneck Analysis
Anticipated bottlenecks based on ADR_v1.0:
- **PostgreSQL Write Contention**: Fixed via row-level locking during bid placement.
- **Redis Connection Limits**: Mitigated via BullMQ concurrency limits.
- **Transfer-Service CPU**: Relies on bounded timeouts and `RetryExecutor`.
