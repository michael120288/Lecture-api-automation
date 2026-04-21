// Lecture 01 — Homework SOLUTION
//
// Read this AFTER you have attempted starter.test.ts yourself.
//
// Run: npm test tests/lecture-01/homework/solution.test.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../../src/config';
import { expectRejected } from '../../../src/test-utils';

const url = `${config.BASE_URL}/signin`;
const wrongCredentials = { username: 'notarealuser99999', password: 'WrongPass@9999' };

// ONE shared request for tests 1, 2, 3 — avoids making 3 redundant HTTP calls
let response!: AxiosResponse;

beforeAll(async () => {
  response = await axios.post(url, wrongCredentials, {
    validateStatus: () => true,
  });
});

// ─── Solution 1 ───────────────────────────────────────────────────────────────
// toMatchObject() asserts the FULL structure in one call.
// expect.any(String) means "I don't care about the exact value, just that it's a string".
// This is useful when the exact message could vary (e.g. between rate limit and validation).
// The guard `if (response.status === 429) return` skips the shape check when rate-limited
// because a 429 response has a different shape: { message } only, no status or statusCode.
it('response body matches the error shape', () => {
  if (response.status === 429) {
    expect(response.data).toHaveProperty('message');
    return;
  }

  expect(response.data).toMatchObject({
    message: expect.any(String),
    status: 'error',
    statusCode: expect.any(Number),
  });
});

// ─── Solution 2 ───────────────────────────────────────────────────────────────
// Three negative assertions in one test — efficient, one request for all.
// .not.toHaveProperty() is the negative form of .toHaveProperty().
// These are security assertions — error responses must never leak credentials or tokens.
it('response does not leak token, user, or password', () => {
  expect(response.data).not.toHaveProperty('token');
  expect(response.data).not.toHaveProperty('user');
  expect(response.data).not.toHaveProperty('password');
});

// ─── Solution 3 ───────────────────────────────────────────────────────────────
// Header check + status negative check — both use the shared response.
//
// Why toContain() for the header?
// The actual value is "application/json; charset=utf-8"
// toBe('application/json') would fail on the suffix.
// toContain() passes as long as the string includes 'application/json'.
it('Content-Type is JSON and status is not a success code', () => {
  expect(response.headers['content-type']).toContain('application/json');
  expect(response.status).not.toBe(200);
  expect(response.status).not.toBe(201);
});

// ─── Solution 4 ───────────────────────────────────────────────────────────────
// Boundary value test — tests the schema minimum rule.
// Username 'abc' = 3 chars, below the Joi minimum of 4.
//
// expect([400, 429]).toContain() accepts both:
//   400 = Joi rejected the input (correct behavior)
//   429 = nginx rate limited us (hit request quota)
// Both mean the request was not processed — the test still passes.
//
// The `if (res.status === 400)` guard checks the message ONLY when we have
// a real validation error (not a rate limit response).
it('username shorter than 4 chars is rejected', async () => {
  const res = await axios.post(
    url,
    { username: 'abc', password: 'ValidPass@1' },
    { validateStatus: () => true },
  );

  expectRejected(res.status);

  if (res.status === 400) {
    expect(res.data.message).toContain('Invalid username');
  }
});

// ─── Solution 5 ───────────────────────────────────────────────────────────────
// The .then() style — same shape validation as Solution 1, different syntax.
//
// Key reminders:
//   - No `async` on the function — it returns a Promise (not async itself)
//   - `return` is mandatory — without it Vitest finishes the test before .then() runs
//   - The 429 guard works the same way inside .then()
it('response body matches error shape — .then() style', () => {
  return axios.post(url, wrongCredentials, { validateStatus: () => true })
    .then(res => {
      if (res.status === 429) {
        expect(res.data).toHaveProperty('message');
        return;
      }

      expect(res.data).toMatchObject({
        message: expect.any(String),
        status: 'error',
        statusCode: expect.any(Number),
      });
    });
});

// ─── Solution 6 ───────────────────────────────────────────────────────────────
// toMatch(/regex/) tests a string against a regular expression.
// /\S+/ means "one or more non-whitespace characters" — any non-blank string passes.
//
// WHY toMatch instead of .toContain() or .toBe()?
// When the exact value can vary (e.g. 400 returns "Invalid credentials" while 429
// returns a different message), a regex is more resilient than an exact string.
// /\S+/ is the minimal check: the field is populated and not just whitespace.
it('message matches non-empty string regex — toMatch', () => {
  expect(response.data.message).toMatch(/\S+/);
});

// ─── Solution 7 ───────────────────────────────────────────────────────────────
// Two different assertion styles in one test:
//
// toBeTypeOf('number')
//   WHY: Vitest-specific — cleaner than `expect(typeof x).toBe('number')`.
//   The failure message says "expected 'string' to be 'number'" which is more readable
//   than the generic message from the typeof workaround.
//
// toBeTruthy()
//   WHY: any non-empty string is truthy, so this is a loose but quick existence check.
//   Use when you only care that the field is populated, not its exact value.
//   Contrast with toBe('Invalid credentials') which would fail on a 429 response.
it('statusCode is type number and message is truthy', () => {
  expect(response.data.statusCode).toBeTypeOf('number');
  expect(response.data.message).toBeTruthy();
});
