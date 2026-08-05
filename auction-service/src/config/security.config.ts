import { env } from './env';

export const securityConfig = {
  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
  },
};
