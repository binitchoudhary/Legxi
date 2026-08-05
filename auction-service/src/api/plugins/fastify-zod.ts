import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export function setupZodValidator(app: FastifyInstance) {
  app.setValidatorCompiler(({ schema }) => {
    return (data) => {
      try {
        // We use .parse() because .safeParse() doesn't throw and Fastify expects error to be thrown or returned
        // Actually, Fastify validator compiler should return { value, error }
        // Let's use safeParse
        const result = (schema as any).safeParse(data);
        if (result.success) {
          return { value: result.data };
        }
        return { error: result.error };
      } catch (error) {
        return { error };
      }
    };
  });
}
