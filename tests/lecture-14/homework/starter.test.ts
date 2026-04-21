// Lecture 14 — Homework (starter)
// Run: npm test tests/lecture-14/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';

const forgotPwUrl = `${config.BASE_URL}/forgot-password`;
const ssoUrl      = `${config.BASE_URL}/sso`;
const signinUrl   = `${config.BASE_URL}/signin`;

let jwt = '';

beforeAll(async () => {
  const res = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  jwt = res.data.token ?? '';
});

// TODO 1 — POST /forgot-password with email "notreal@nowhere.com". Assert status 400.
it('forgot-password with non-existent email returns 400', async () => {
  // write your code here
});

// TODO 2 — POST /forgot-password with body "{ email: "notanemail" }". Assert status 400, message contains "Field must be valid".
it('forgot-password with invalid email format returns 400', async () => {
  // write your code here
});

// TODO 3 — POST /reset-password/expiredtoken with mismatched passwords. Assert status 400.
it('reset-password with mismatched passwords returns 400', async () => {
  // write your code here
});

// TODO 4 — POST /sso with the JWT from beforeAll. Assert status 200, user exists, message is "SSO login successful".
it('SSO with valid JWT returns 200', async () => {
  // write your code here
});

// TODO 5 — .then() style: POST /sso with empty body. Assert status 400, message is "Token required".
it('SSO with empty body returns 400 — .then() style', () => {
  // write your code here — no async, must return promise
});

// TODO 6 — POST /sso with an empty body. The response has no token field.
// Use `res.data.token ?? null` to coerce the missing field to null.
// Assert with toBeNull() — it is more explicit than toBe(null) and reads as intent.
it('toBeNull — error response has no token (explicit null check)', async () => {
  // write your code here
});

// TODO 7 — Use the JWT captured in beforeAll.
// Assert that jwt matches the pattern /^[\w-]+\.[\w-]+\.[\w-]+$/ using toMatch().
// This regex checks the three-segment dot-separated structure of a JWT.
it('toMatch — JWT from signin matches JWT format regex', async () => {
  // write your code here
});
