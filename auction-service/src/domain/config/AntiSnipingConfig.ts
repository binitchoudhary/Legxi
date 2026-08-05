export interface AntiSnipingConfig {
  /**
   * If a bid is placed within this many milliseconds of the auction end time,
   * the auction end time should be extended.
   */
  triggerWindowMs: number;

  /**
   * The amount of time in milliseconds to extend the auction by.
   */
  extensionDurationMs: number;

  /**
   * The maximum number of times an auction can be extended.
   */
  maxExtensions: number;
}

export interface ExtensionDecision {
  shouldExtend: boolean;
  newEndTime?: Date;
}
