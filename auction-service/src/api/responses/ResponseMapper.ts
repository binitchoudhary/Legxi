import { FastifyRequest } from 'fastify';
import { StandardResponse, ResponseMeta } from '../dto/response.dto';

export class ResponseMapper {
  static success<T>(request: FastifyRequest, data: T, nextCursor?: string): StandardResponse<T> {
    // Custom properties injected by the middleware in app.ts
    const reqAny = request as any;
    const meta: ResponseMeta = {
      requestId: request.id,
      traceId: reqAny.traceId || request.id, // Fallback if traceId wasn't populated
      version: 'v1',
    };

    if (nextCursor) {
      meta.nextCursor = nextCursor;
    }

    return {
      success: true,
      data,
      meta,
    };
  }
}
