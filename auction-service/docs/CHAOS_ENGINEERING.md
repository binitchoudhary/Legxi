# Chaos Engineering Strategy

This document outlines theoretical simulated degradation scenarios to validate system resilience.

## Scenarios & Expected Behavior

1. **Database Unavailable**
   - **Trigger**: Isolate PostgreSQL port or stop service.
   - **Behavior**: `/health/dependencies` returns 503. Readiness probe fails, removing pod from load balancer. Bids fast-fail with HTTP 500.

2. **Redis Unavailable / Redis Restart**
   - **Trigger**: Kill Redis container unexpectedly.
   - **Behavior**: Queue processing halts temporarily. `BullMQ` gracefully pauses until reconnection. In-flight tasks may fail but will be retried by BullMQ's at-least-once guarantee. Event loss is mitigated since core events are outboxed in Postgres.

3. **PostgreSQL Primary Failover**
   - **Trigger**: Manually initiate a primary-to-replica failover in AWS RDS / Cloud.
   - **Behavior**: Connections drop briefly. Prisma triggers connection resets. `RetryExecutor` catches transient domain errors and replays up to 3 times, successfully masking the sub-10 second failover from users.

4. **Transfer-Service Timeout**
   - **Trigger**: Use Toxiproxy to inject >5000ms latency on outgoing transfer calls.
   - **Behavior**: `HttpTransferServiceAdapter` respects 5s timeout. It throws a transient error. `CertificateTransferProcessManager` falls back to `RetryExecutor` and tries again later.

5. **Notification Failure**
   - **Trigger**: Return HTTP 500 from Mock Notification Service.
   - **Behavior**: Notification engine records `RETRYABLE_FAILURE`. Does not impact Settlement or Auction state.

6. **Payment Gateway Timeout**
   - **Trigger**: Reject or delay Razorpay API responses.
   - **Behavior**: Settlement remains `PENDING`. Razorpay webhook later acts as the authoritative truth and resumes the process manager.

7. **High CPU / Memory Pressure**
   - **Trigger**: Run a CPU burn script inside the container.
   - **Behavior**: Horizontal Pod Autoscaler (HPA) triggers on >70% CPU, spinning up additional replicas. Event loop latency increases but overall throughput scales.

8. **Network Latency / Slow Database / Clock Skew**
   - **Trigger**: Network disruption tools (e.g. Chaos Mesh).
   - **Behavior**: Traces will highlight latency origin. `AuctionStatePolicy` handles clock skew gracefully if within reasonable bounds (uses DB time primarily).

9. **Worker Crash & Queue Backlog**
   - **Trigger**: OOM kill the worker pods while injecting massive loads.
   - **Behavior**: Kubernetes orchestrator restarts pod. BullMQ re-claims stalled active jobs and completes them (idempotency relies on Settlement IDs and Correlation IDs).
