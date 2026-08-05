import { env } from './env';

export const appConfig = {
  env: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
};
