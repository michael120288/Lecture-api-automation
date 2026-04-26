// Lecture 02 — Homework SOLUTION
//
// Run: npm test tests/lecture-02/homework/solution.test.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../../src/config';
import { expectRejected } from '../../../src/test-utils';
import { TEST_CLEANUP_SECRET } from '../../../src/fixtures';

const signinUrl = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let response!: AxiosResponse;
let sessionCookie: string = '';

beforeAll(async () => {
  response = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });

  // cookie-session sets TWO cookies: session + session.sig — both required
  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
});

afterAll(async () => {
  if (!sessionCookie) return;
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// ─── Solution 1 ───────────────────────────────────────────────────────────────
// Multiple expect() calls in one test is perfectly valid — especially for
// related assertions that all verify "this signin succeeded".
// Each assertion is a separate check; if one fails, the test stops there.
it('successful signin returns status 200 with token and user', () => {
  expect(response.status).toBe(200);
  expect(response.data.message).toBe('User login successfully');
  expect(response.data.token).toBeDefined();
  expect(response.data.user).toBeDefined();
});

// ─── Solution 2 ───────────────────────────────────────────────────────────────
// JWT format check: split on '.' gives 3 parts.
// The header is ALWAYS base64url-encoded JSON starting with {"alg":...}
// When base64url-encoded, {"alg":... always produces a string starting with 'eyJ'
// ('e' = '{', 'y' = '"', 'J' = 'a' in base64 — 'eyJ' literally means '{"' base64).
// This check works for any valid JWT regardless of algorithm.
it('token has valid JWT format', () => {
  const parts = response.data.token.split('.');
  expect(parts).toHaveLength(3);
  expect(parts[0].startsWith('eyJ')).toBe(true);
});

// ─── Solution 3 ───────────────────────────────────────────────────────────────
// Three related assertions in one test — they all belong together because
// they verify the security properties of a successful signin response.
it('cookie is set and password is not exposed', () => {
  expect(response.headers['set-cookie']).toBeDefined();
  expect(sessionCookie).toContain('session=');
  expect(response.data.user).not.toHaveProperty('password');
});

// ─── Solution 4 ───────────────────────────────────────────────────────────────
// The key proof that signin worked: the cookie unlocks a protected endpoint.
// Without the cookie the same GET returns 401.
// With the cookie it returns 200 — the server verified our session.
it('session cookie works for authenticated request', async () => {
  const authResponse = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  expect(authResponse.status).toBe(200);
});

// ─── Solution 5 ───────────────────────────────────────────────────────────────
// .then() style reminder:
//   - No `async` on the function
//   - MUST return the promise (without return, test passes before .then() runs)
//   - expectRejected([400, 429]) handles the rate-limit case from production
it('wrong password is rejected — .then() style', () => {
  return axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: 'DefinitelyWrong@999',
  }, { validateStatus: () => true })
    .then(res => {
      expectRejected(res.status);
    });
});

// ─── Solution 6 ───────────────────────────────────────────────────────────────
// toMatch(/regex/) validates the structure of the JWT string using a pattern.
// /^[\w-]+\.[\w-]+\.[\w-]+$/ matches exactly three base64url segments joined by dots.
//
// WHY toMatch instead of splitting and checking parts.length?
// toMatch is a single assertion that communicates the intent ("this is a JWT") in one line.
// Section 2 of the lecture used .split('.') + toHaveLength — both approaches are valid;
// toMatch is more concise when you only need the structural check.
it('token matches JWT regex — toMatch', () => {
  expect(response.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
});

// ─── Solution 7 ───────────────────────────────────────────────────────────────
// expect.stringMatching() is an asymmetric matcher — it can be used standalone
// (inside toEqual) or embedded inside toMatchObject for nested string fields.
//
// WHY expect.stringMatching instead of toContain()?
// .toContain() is a direct assertion; expect.stringMatching is composable.
// When you need to assert multiple fields in one toMatchObject call, you can use
// expect.stringMatching for the string fields rather than mixing .toContain().
// Here we use it standalone to show the pattern before composing it later.
it('session cookie matches "session=" pattern — expect.stringMatching', () => {
  expect(sessionCookie).toEqual(expect.stringMatching(/session=/));
});
