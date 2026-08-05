import { OperationalTimelineDTO } from '../../queries/models/OperationalViews';

export interface AuditEvent {
  timestamp: Date;
  source: string;
  eventType: string;
  details: any;
}

export class OperationalTimelineAssembler {
  public assemble(auctionId: string, sources: AuditEvent[][]): OperationalTimelineDTO {
    // Flatten and merge all disparate event arrays
    const mergedEvents = sources.flat();

    // Chronologically sort (oldest to newest)
    mergedEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      auctionId,
      events: mergedEvents
    };
  }
}
