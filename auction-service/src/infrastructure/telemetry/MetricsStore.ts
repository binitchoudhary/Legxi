export class MetricsStore {
  private metrics: Record<string, number> = {
    'auction_active': 0,
    'auction_completed': 0,
    'settlement_created': 0,
    'settlement_completed': 0,
    'settlement_failed': 0,
    'transfer_retries': 0,
    'transfer_failures': 0,
    'notification_sent': 0,
    'notification_failed': 0,
    'admin_manual_retries': 0,
  };

  private latencies: number[] = [];

  constructor() {}

  public processEvent(topic: string) {
    if (topic === 'AuctionStarted') { this.increment('auction_active'); }
    if (topic === 'AuctionClosedWithWinner' || topic === 'AuctionClosedNoWinner') {
      this.increment('auction_completed'); 
      this.decrement('auction_active');
    }
    if (topic === 'SettlementCreated') { this.increment('settlement_created'); }
    if (topic === 'SettlementCompleted') { this.increment('settlement_completed'); }
    if (topic === 'SettlementFailed') { this.increment('settlement_failed'); }
  }

  public increment(metric: string, value: number = 1) {
    if (this.metrics[metric] !== undefined) {
      this.metrics[metric] += value;
    }
  }

  public decrement(metric: string, value: number = 1) {
    if (this.metrics[metric] !== undefined) {
      this.metrics[metric] -= value;
    }
  }

  public recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 100) this.latencies.shift(); // keep last 100
  }

  public getPrometheusMetrics(): string {
    let output = '';
    for (const [key, val] of Object.entries(this.metrics)) {
      output += `# HELP ${key} Operational metric\n`;
      output += `# TYPE ${key} counter\n`;
      output += `${key} ${val}\n`;
    }
    const avgLatency = this.latencies.length > 0 ? this.latencies.reduce((a,b)=>a+b, 0) / this.latencies.length : 0;
    output += `# HELP analytics_query_latency_avg Average analytics query latency in ms\n`;
    output += `# TYPE analytics_query_latency_avg gauge\n`;
    output += `analytics_query_latency_avg ${avgLatency}\n`;

    return output;
  }
}
