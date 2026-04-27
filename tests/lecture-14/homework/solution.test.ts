// Lecture 14 — Homework SOLUTION
// Run: npm test tests/lecture-14/homework/solution.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { TEST_CLEANUP_SECRET } from '../../../src/fixtures';

const forgotPwUrl = `${config.BASE_URL}/forgot-password`;
const ssoUrl      = `${config.BASE_URL}/sso`;
const signinUrl   = `${config.BASE_URL}/signin`;

let jwt = '';

beforeAll(async () => {
  const res = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  jwt = res.data.token ?? '';
});

it('forgot-password with non-existent email returns 400', async () => {
  const res = await axios.post(forgotPwUrl, { email: 'notreal@nowhere.com' }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Invalid credentials');
  // The server returns 'Invalid credentials' (not 'Email not found') to prevent email enumeration.
});

it('forgot-password with invalid email format returns 400', async () => {
  const res = await axios.post(forgotPwUrl, { email: 'notanemail' }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  expect(res.status).toBe(400);
  expect(res.data.message).toContain('Field must be valid');
});

// Test validation at the Joi layer (password mismatch) using a fake token.
// The mismatch check runs BEFORE the token lookup — so the error is always 400.
it('reset-password with mismatched passwords returns 400', async () => {
  const res = await axios.post(`${config.BASE_URL}/reset-password/expiredtoken`, {
    password: 'NewPass@123456',
    confirmPassword: 'DifferentPass@123456',
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  expect(res.status).toBe(400);
  expect(res.data.message).toContain('Passwords should match');
});

it('SSO with valid JWT returns 200', async () => {
  const res = await axios.post(ssoUrl, { token: jwt }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  expect(res.status).toBe(200);
  expect(res.data.message).toBe('SSO login successful');
  expect(res.data.user).toBeDefined();
});

it('SSO with empty body returns 400 — .then() style', () => {
  return axios.post(ssoUrl, {}, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true })
    .then(res => {
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Token required');
    });
});

// Solution 6 — toBeNull
// WHY toBeNull: the token field is absent on error responses, so `res.data.token`
// is `undefined`. Coercing with `?? null` then asserting toBeNull() makes the
// intent unmistakably clear — we are explicitly checking for a null/absent value,
// not just a falsy one. toBe(null) would also pass, but toBeNull() reads better.
it('toBeNull — error response has no token (explicit null check)', async () => {
  const res = await axios.post(ssoUrl, {}, { validateStatus: () => true });
  expect(res.data.token ?? null).toBeNull();
});

// Solution 7 — toMatch with JWT regex
// WHY toMatch: a JWT is always three Base64URL segments separated by dots.
// /^[\w-]+\.[\w-]+\.[\w-]+$/ captures that structure concisely. toMatch is more
// informative than just checking typeof or length — it validates the actual format.
it('toMatch — JWT from signin matches JWT format regex', async () => {
  expect(jwt).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
});
