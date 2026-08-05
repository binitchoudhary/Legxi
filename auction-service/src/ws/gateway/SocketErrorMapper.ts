import { ZodError } from 'zod';
import { AppError, ValidationError } from '../../shared/errors';
import { logger } from '../../shared/logger';

export interface SocketErrorPayload {
  code: string;
  message: string;
  details?: any[];
}

export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: SocketErrorPayload;
}

export class SocketErrorMapper {
  static mapError(error: unknown): SocketErrorPayload {
    if (error instanceof ZodError) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: error.issues,
      };
    }

    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
        details: error instanceof ValidationError ? (error.details as any) : undefined,
      };
    }

    logger.error({ err: error }, 'Unhandled socket error');
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  static createErrorResponse(error: unknown): SocketResponse {
    return {
      success: false,
      error: this.mapError(error),
    };
  }

  static createSuccessResponse<T>(data: T): SocketResponse<T> {
    return {
      success: true,
      data,
    };
  }
}
