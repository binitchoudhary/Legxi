export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message, 500, 'INFRASTRUCTURE_ERROR', false);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false);
  }
}

// Phase 2.2 Auth Errors
export class AuthenticationRequired extends AppError {
  constructor(message = 'Authentication is required to access this resource') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

export class PermissionDenied extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'PERMISSION_DENIED');
  }
}

export class InvalidIdentity extends AppError {
  constructor(message = 'The provided identity is invalid or malformed') {
    super(message, 401, 'INVALID_IDENTITY');
  }
}

export class IdentityExpired extends AppError {
  constructor(message = 'The provided identity has expired') {
    super(message, 401, 'IDENTITY_EXPIRED');
  }
}

export class RoleMissing extends AppError {
  constructor(message = 'Required role is missing') {
    super(message, 403, 'ROLE_MISSING');
  }
}
