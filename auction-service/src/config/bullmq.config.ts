import { redisConfig } from './redis.config';

export const bullmqConfig = {
  connection: {
    url: redisConfig.url,
  },
};
