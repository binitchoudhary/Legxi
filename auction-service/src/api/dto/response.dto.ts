import { z } from 'zod';

export const ResponseMetaSchema = z.object({
  requestId: z.string().uuid(),
  traceId: z.string(),
  version: z.literal('v1'),
  nextCursor: z.string().optional(),
});

export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(z.any()).optional(),
});

// A factory for success envelopes, we won't strictly validate outgoing unless necessary,
// but defining the types is useful.
export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export interface StandardResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ErrorResponse {
  success: false;
  error: ErrorPayload;
  meta: ResponseMeta;
}
