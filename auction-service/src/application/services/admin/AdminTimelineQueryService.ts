import { OperationalTimelineAssembler, AuditEvent } from './OperationalTimelineAssembler';
import { OperationalTimelineDTO } from '../../queries/models/OperationalViews';
import { PrismaClient } from '@prisma/client';

export class AdminTimelineQueryService {
  constructor(
    private readonly assembler: OperationalTimelineAssembler,
    private readonly prisma: PrismaClient
  ) {}

  public async getOperationalTimeline(auctionId: string): Promise<OperationalTimelineDTO> {
    const sources: AuditEvent[][] = [];

    // Fetch from outbox/audit tables using raw queries to remain within CQRS boundaries.
    // In a production system, these might hit distinct 'audit_events' tables, 
    // but we simulate gathering them from the Prisma DB here.
    
    // 1. Fetch Auction Audit Events (Assuming an outbox or audit_events table exists)
    try {
      const auditEvents = await this.prisma.$queryRaw<any[]>`
        SELECT created_at, aggregate_type, event_type, payload 
        FROM outbox 
        WHERE aggregate_id = ${auctionId}
      `;
      sources.push(auditEvents.map(e => ({
        timestamp: new Date(e.created_at),
        source: e.aggregate_type || 'AUCTION',
        eventType: e.event_type,
        details: e.payload
      })));
    } catch {
      // Fallback if outbox doesn't exist or map exactly
    }

    return this.assembler.assemble(auctionId, sources);
  }
}
