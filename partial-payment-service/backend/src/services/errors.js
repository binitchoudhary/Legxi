export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class DuplicateRequestError extends Error {
  constructor(message, existingAttempt = null) {
    super(message);
    this.name = 'DuplicateRequestError';
    this.existingAttempt = existingAttempt;
  }
}

export class BusinessRuleError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'BusinessRuleError';
    this.details = details;
  }
}

export class RollbackError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'RollbackError';
    this.details = details;
  }
}

export class ConcurrentRequestError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ConcurrentRequestError';
    this.details = details;
  }
}
