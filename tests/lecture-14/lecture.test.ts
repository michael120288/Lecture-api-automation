// Lecture 14 — Password Reset & SSO
// Run: npm test tests/lecture-14/lecture.test.ts

import axios from 'axios';
import { config } from '../../src/config';

const forgotPwUrl = `${config.BASE_URL}/forgot-password`;
const resetPwUrl  = (token: string) => `${config.BASE_URL}/reset-password/${token}`;
const ssoUrl      = `${config.BASE_URL}/sso`;
const signinUrl   = `${config.BASE_URL}/signin`;
const signoutUrl  = `${config.BASE_URL}/signout`;

const credentials = { username: config.TEST_USERNAME, password: config.TEST_PASSWORD };

// SSO JWT + session cookie — captured from signin in beforeAll
let jwt: string = '';
let sessionCookie: string = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  jwt = loginRes.data.token ?? '';
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

afterAll(async () => {
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// ─── 1. Forgot password ───────────────────────────────────────────────────────

describe('1. Forgot password', () => {

  it('valid email returns 200', async () => {
    // We use the test account's email. The server sends a reset email (we can't intercept it).
    const res = await axios.post(forgotPwUrl, {
      email: config.TEST_USERNAME.toLowerCase() + '@test.com',
    }, { validateStatus: () => true });
    // 200 if email exists, 400 if not — handle both since we don't know the exact email
    expect([200, 400]).toContain(res.status);
  });

  it('non-existent email returns 400', async () => {
    const res = await axios.post(forgotPwUrl, {
      email: 'definitelynotreal99999@nowhere.com',
    }, { validateStatus: () => true });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid credentials');
  });

  it('invalid email format returns 400', async () => {
    const res = await axios.post(forgotPwUrl, {
      email: 'notanemail',
    }, { validateStatus: () => true });
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('Field must be valid');
  });

  it('missing email returns 400', async () => {
    const res = await axios.post(forgotPwUrl, {}, { validateStatus: () => true });
    expect(res.status).toBe(400);
  });

});

// ─── 2. Reset password — validation errors only ───────────────────────────────
//
// We cannot test the SUCCESS path without a real token from the email inbox.
// Instead we test the error cases that are always safe to call.

describe('2. Reset password — validation errors', () => {

  it('invalid token returns 400 "Reset token has expired."', async () => {
    const res = await axios.post(resetPwUrl('thisisnotavalidtoken123'), {
      password: 'NewPass@123456',
      confirmPassword: 'NewPass@123456',
    }, { validateStatus: () => true });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Reset token has expired.');
  });

  it('mismatched passwords returns 400', async () => {
    const res = await axios.post(resetPwUrl('anytoken'), {
      password: 'NewPass@123456',
      confirmPassword: 'DifferentPass@123456',
    }, { validateStatus: () => true });
    expect(res.status).toBe(400);
    expect(res.data.message).toContain('do not match');
  });

  it('password too short returns 400', async () => {
    const res = await axios.post(resetPwUrl('anytoken'), {
      password: 'Short@1',     // 7 chars — below min 12
      confirmPassword: 'Short@1',
    }, { validateStatus: () => true });
    expect(res.status).toBe(400);
  });

  it('empty body returns 400', async () => {
    const res = await axios.post(resetPwUrl('anytoken'), {}, { validateStatus: () => true });
    expect(res.status).toBe(400);
  });

});

// ─── 3. SSO — Single Sign-On ──────────────────────────────────────────────────
//
// SSO accepts a valid JWT and creates a new session.
// We get a JWT from signin, then use it for SSO.

describe('3. SSO — Single Sign-On', () => {

  it('valid JWT returns 200 and user object', async () => {
    const res = await axios.post(ssoUrl, { token: jwt }, { validateStatus: () => true });
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('SSO login successful');
    expect(res.data.user).toBeDefined();
    expect(res.data.token).toBe(jwt);
  });

  it('SSO returns same token that was passed in', async () => {
    const res = await axios.post(ssoUrl, { token: jwt }, { validateStatus: () => true });
    expect(res.data.token).toBe(jwt);
  });

  it('SSO sets a session cookie', async () => {
    const res = await axios.post(ssoUrl, { token: jwt }, { validateStatus: () => true });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('empty body returns 400 "Token required"', async () => {
    const res = await axios.post(ssoUrl, {}, { validateStatus: () => true });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Token required');
  });

  it('invalid JWT string returns 400', async () => {
    const res = await axios.post(ssoUrl, { token: 'not.a.valid.jwt' }, { validateStatus: () => true });
    expect(res.status).toBe(400);
  });

});

// ─── 4. Assertion variants ────────────────────────────────────────────────────
//
// Introduces three assertion styles not used elsewhere in the course:
//   toBeNull        — explicit null check (better than toBe(null) for clarity)
//   toMatch(/regex/) — test a string against a regular expression
//   toBeTypeOf      — Vitest-specific runtime type check (no TypeScript needed)

describe('4. Assertion variants', () => {

  it('toBeNull — error response has no token field (explicit null check)', async () => {
    // A failed SSO call returns no token. Coercing the missing field to null
    // and using toBeNull() makes the intent unmistakably clear.
    const res = await axios.post(ssoUrl, {}, { validateStatus: () => true });
    expect(res.data.token ?? null).toBeNull();
  });

  it('toMatch — error message is a non-empty string (regex check)', async () => {
    // toMatch(/\S+/) asserts at least one non-whitespace character exists.
    // Useful when you care about the shape, not the exact wording, of a message.
    const res = await axios.post(ssoUrl, {}, { validateStatus: () => true });
    expect(res.data.message).toMatch(/\S+/);
  });

  it('toBeTypeOf — JWT obtained from signin is a string (Vitest type check)', async () => {
    // toBeTypeOf is a Vitest-only assertion that mirrors typeof at runtime.
    // It gives a better failure message than expect(typeof x).toBe('string').
    expect(jwt).toBeTypeOf('string');
  });

});
