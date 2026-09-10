import { PrismaClient } from '@prisma/client';
import { IAuctionService } from '../api/services/IAuctionService';

/** Layer 7: 7-day archive delay (in milliseconds). Application config, no schema change. */
const ARCHIVE_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export class StateTransitionScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auctionService: IAuctionService,
    private readonly pollIntervalMs: number = 5000
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

  public async tick() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();
      const prepWindow = new Date(now.getTime() + 5 * 60 * 1000);
      const gracePeriod = new Date(now.getTime() - 10 * 1000);

      // Existing Layer 5 time-based transition candidates
      const candidates = await this.prisma.auction.findMany({
        where: {
          OR: [
            { status: 'SCHEDULED', startTime: { lte: prepWindow } },
            { status: 'PREPARING', startTime: { lte: now } },
            { status: 'LIVE', endTime: { lte: now } },
            { status: 'EXTENDED', endTime: { lte: now } },
            { status: 'ENDING', endTime: { lte: gracePeriod } }
          ]
        },
        select: { id: true },
        take: 50 // process in batches
      });

      for (const candidate of candidates) {
        try {
          await this.auctionService.advanceState(candidate.id);
        } catch (err) {
          console.error(`[StateTransitionScheduler] Failed to advance auction ${candidate.id}:`, err);
        }
      }

      // Layer 7: Discover SETTLED auctions eligible for archival (7-day delay)
      const archiveThreshold = new Date(now.getTime() - ARCHIVE_DELAY_MS);
      const archiveCandidates = await this.prisma.auction.findMany({
        where: {
          status: 'SETTLED',
          updatedAt: { lte: archiveThreshold }
        },
        select: { id: true },
        take: 50
      });

      for (const candidate of archiveCandidates) {
        try {
          await this.auctionService.archiveAuction(candidate.id);
        } catch (err) {
          console.error(`[StateTransitionScheduler] Failed to archive auction ${candidate.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[StateTransitionScheduler] Tick failed:', err);
    } finally {
      this.isRunning = false;
    }
  }
}

