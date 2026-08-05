# Operational Runbook - Auction Service

## 1. Alert Catalogue

| Alert Name | Condition | Severity | Playbook |
|------------|-----------|----------|----------|
| `HighTransferFailureRate` | `rate(transfer_failures[5m]) > 0.05` | CRITICAL | Verify Transfer-Service availability. Check logs for authentication issues. Execute manual retries via Admin operations if needed. |
| `SettlementCreationStalled` | `rate(settlement_created[1h]) == 0` AND `rate(auction_completed[1h]) > 0` | HIGH | The SettlementProcessManager is failing to consume `AuctionClosedWithWinner` events. Check Event Publisher logs. |
| `DatabaseLatencySpike` | `p99(db_query_duration_ms) > 1000` | WARNING | Check Postgres load. Review if analytical queries are dragging down operational connections. |

## 2. Failure Scenarios & Recovery

**Scenario**: Razorpay Webhook fails to reach Auction Service.
**Recovery**: Settlement aggregate remains stuck in `PENDING`. An internal Admin cron or manual retry should sync state with the Razorpay API.

**Scenario**: Transfer-Service API returns 500 continuously.
**Recovery**: 
1. Allow automatic retries in `RetryExecutor` to burn out. 
2. Transfer record marks as `FAILED`. 
3. Resolve upstream issue. 
4. Trigger manual retry via `POST /api/v1/admin/operations/transfers/:id/retry`.

## 3. Checklists

### Deployment Checklist
- [ ] Ensure database migrations are executed against the replica before main.
- [ ] Review environment variables (ensure `TRANSFER_SERVICE_URL` and `RAZORPAY_KEY` are mounted).
- [ ] Validate `/health/ready` returns 200 after pod startup.

### Rollback Checklist
- [ ] Trigger Helm rollback to previous successful revision.
- [ ] Monitor `/health/dependencies` to ensure no database schema incompatibility exists.
- [ ] Acknowledge PagerDuty alerts as "Investigating" post-rollback.

### Disaster Recovery Checklist
- [ ] Restore PostgreSQL from the latest point-in-time recovery snapshot.
- [ ] Restart all Auction-Service pods to clear any stale cache state.
- [ ] Utilize Admin Timeline queries to identify the delta of lost events.
