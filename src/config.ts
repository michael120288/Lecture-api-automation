// Central config — reads from .env via vitest.config.ts
// Never hardcode BASE_URL or credentials here

const BASE_URL = process.env.BASE_URL;
const TEST_USERNAME = process.env.TEST_USERNAME;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) throw new Error('Missing env var: DATABASE_URL');

if (!BASE_URL) {
  throw new Error('Missing env var: BASE_URL — copy .env.example to .env and fill it in');
}

if (!TEST_USERNAME) {
  throw new Error('Missing env var: TEST_USERNAME — add a pre-existing test account username to your .env file');
}

if (!TEST_PASSWORD) {
  throw new Error('Missing env var: TEST_PASSWORD — add the password for TEST_USERNAME to your .env file');
}

export const config = {
  BASE_URL,
  TEST_USERNAME,
  TEST_PASSWORD,
  DATABASE_URL
} as const;