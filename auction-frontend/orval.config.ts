import { defineConfig } from 'orval';

export default defineConfig({
  auction: {
    input: '../auction-service/docs/contracts/openapi.yaml',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/auctionApi.ts',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      mock: true, // Will generate MSW handlers!
      override: {
        mutator: {
          path: 'src/api/client/axios.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
});
