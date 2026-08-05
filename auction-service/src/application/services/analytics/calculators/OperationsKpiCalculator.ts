import { RawOperationsData, OperationsKpiDTO } from '../../../queries/models/AnalyticsViews';

export class OperationsKpiCalculator {
  public calculate(rawData: RawOperationsData[]): OperationsKpiDTO {
    let totalNotifs = 0;
    let successNotifs = 0;
    let failedNotifs = 0;

    let totalTransfers = 0;
    let successTransfers = 0;
    let failedTransfers = 0;

    for (const row of rawData) {
      const status = row.status.toUpperCase();
      const count = row.count;

      if (row.entityType === 'NOTIFICATION') {
        totalNotifs += count;
        if (status === 'SENT' || status === 'SUCCESS') successNotifs += count;
        if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'RETRYABLE_FAILURE') failedNotifs += count;
      } else if (row.entityType === 'TRANSFER') {
        totalTransfers += count;
        if (status === 'SUCCESS' || status === 'COMPLETED') successTransfers += count;
        if (status === 'FAILED' || status === 'TIMED_OUT' || status === 'RETRYABLE_FAILURE') failedTransfers += count;
      }
    }

    const notifRate = totalNotifs > 0 ? ((successNotifs / totalNotifs) * 100).toFixed(2) + '%' : '100.00%';
    const transferRate = totalTransfers > 0 ? ((successTransfers / totalTransfers) * 100).toFixed(2) + '%' : '100.00%';

    return {
      notificationDeliveryRate: notifRate,
      transferSuccessRate: transferRate,
      failedNotificationsCount: failedNotifs,
      failedTransfersCount: failedTransfers
    };
  }
}
