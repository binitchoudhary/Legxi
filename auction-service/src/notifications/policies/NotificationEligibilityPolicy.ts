export class NotificationEligibilityPolicy {
  /**
   * Evaluates if a user is eligible to receive a specific notification.
   * Currently, this always evaluates to TRUE as a placeholder.
   * Future implementation will check user preferences.
   */
  async isEligible(userId: string, notificationType: string): Promise<boolean> {
    return true; // Placeholder for future preference logic
  }
}
