import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

dotenvConfig({ path: resolve(__dirname, '.env') });

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    fileParallelism: false,

    // Reporters: html locally, JUnit in CI
    reporters: process.env.CI ? ['junit', 'verbose'] : ['html', 'verbose'],
    outputFile: {
      html: 'html/index.html',
      junit: 'test-results/junit.xml',
    },

    // Coverage — run with: npm run test:coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },

    env: {
      BASE_URL:      process.env.BASE_URL      ?? '',
      TEST_USERNAME: process.env.TEST_USERNAME ?? '',
      TEST_PASSWORD: process.env.TEST_PASSWORD ?? '',
      DATABASE_URL:  process.env.DATABASE_URL  ?? '',
    },
  },
});
