import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const reqAny = request as any;
  const meta = {
    requestId: request.id,
    traceId: reqAny.traceId || request.id,
    version: 'v1',
  };

  // Handle Domain/App Errors
  if (error instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      meta,
    };

    const errWithDetails = error as AppError & { details?: unknown };
    if (errWithDetails.details) {
      (response.error as Record<string, unknown>).details = errWithDetails.details;
    }

    request.log.warn({ err: error, code: error.code }, 'Operational Error');
    return reply.status(error.statusCode).send(response);
  }

  // Handle Fastify Validation Errors (Zod / JSON Schema)
  if (error.validation) {
    request.log.warn({ err: error }, 'Validation Error');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: error.validation,
      },
      meta,
    });
  }

  // Unhandled / Unexpected Errors
  request.log.error({ err: error }, 'Unhandled Internal Server Error');
  
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
    meta,
  });
}
