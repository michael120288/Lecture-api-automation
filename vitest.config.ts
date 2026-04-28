import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env so values are available in test worker threads
dotenvConfig({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    // Docker/CI: first request includes DNS + TLS handshake — give beforeAll more time
    hookTimeout: 30000,
    reporters: ['verbose'],
    // Sequential: avoids hitting auth rate limits when running all lectures
    fileParallelism: false,
    env: {
      BASE_URL: process.env.BASE_URL ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
      DATABASE_URL: process.env.DATABASE_URL ?? '',
    },
  },
});
