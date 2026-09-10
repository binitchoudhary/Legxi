import { PrismaClient } from '@prisma/client';

export class OutboxRelayWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly pollIntervalMs: number = 2000
  ) {}

  public start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Fetch PENDING events. We don't hold a long lock, just get the candidates.
      // In a multi-node setup without SKIP LOCKED on the SELECT, we might have contention,
      // but we will do a targeted SELECT FOR UPDATE SKIP LOCKED per event next.
      const candidates = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { id: true }
      });

      for (const candidate of candidates) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Safe claiming via SKIP LOCKED for this specific event
            const rows: any[] = await tx.$queryRaw`
              SELECT * FROM outbox_events 
              WHERE id = ${candidate.id} AND status = 'PENDING'
              FOR UPDATE SKIP LOCKED
            `;

            if (rows.length === 0) return; // Claimed by another worker or already processed
            
            const ev = rows[0];

            if (ev.event_type === 'AUDIT_LOG_ENTRY') {
              const payload = typeof ev.payload === 'string' ? JSON.parse(ev.payload) : ev.payload;
              
              // Idempotent insertion mapping OutboxEvent.id -> AuditLog.id
              await tx.$executeRaw`
                INSERT INTO audit_logs (id, entity_type, entity_id, actor_id, action, new_state, created_at)
                VALUES (
                  ${ev.id}, 
                  ${payload.entityType}, 
                  ${payload.entityId}, 
                  ${payload.actorId}, 
                  ${payload.action}, 
                  ${JSON.stringify(payload.newState)}::jsonb, 
                  NOW()
                )
                ON CONFLICT (id) DO NOTHING
              `;
            }
            
            // Mark processed
            await tx.$executeRaw`
              UPDATE outbox_events 
              SET status = 'PROCESSED', processed_at = NOW() 
              WHERE id = ${ev.id}
            `;
          }, { isolationLevel: 'ReadCommitted' });
        } catch (err) {
          console.error(`[OutboxRelayWorker] Failed to process event ${candidate.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[OutboxRelayWorker] Tick failed:', err);
    } finally {
      this.isRunning = false;
    }
  }
}
