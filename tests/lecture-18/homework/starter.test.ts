// Lecture 18 — Homework (starter)
// Run: npm test tests/lecture-18/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { expectRejected } from '../../../src/test-utils';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let sessionCookie = '';
let token = '';

beforeAll(async () => {
  const r = await axios.post(
    signinUrl,
    { username: config.TEST_USERNAME, password: config.TEST_PASSWORD },
    { validateStatus: () => true },
  );
  const raw = r.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
  token = r.data?.token ?? '';
});

afterAll(async () => {
  if (!sessionCookie) return;
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// TODO 1 — Deliberately omit validateStatus so axios throws on a 4xx response.
// Use try/catch to catch the thrown AxiosError.
// Assert that the caught error has a `.response` property.
// Assert that err.response.status is 401 (unauthenticated GET without a cookie).
// Hint: call axios.get(currentUserUrl) WITHOUT validateStatus. Do NOT pass any Cookie header.
it('missing validateStatus — axios throws; error has .response', async () => {
  // write your code here
});

// TODO 2 — First: sign in WITHOUT capturing the cookie. Pass Cookie: '' to GET /currentuser.
// Assert the status is 401.
// Second: use the correctly captured sessionCookie from beforeAll. Assert the status is 200.
// Hint: you need two separate axios calls in one test (or two separate it() blocks).
it('empty cookie returns 401; captured cookie returns 200', async () => {
  // write your code here
});

// TODO 3 — Call GET /currentuser with the session cookie.
// Add console.log(res.data) BEFORE your assertion.
// Run: npm test tests/lecture-18/homework/starter.test.ts
// Read the console output — notice the shape of res.data.
// THEN remove the console.log line before committing.
it('console.log reveals response shape', async () => {
  // write your code here
});

// TODO 4 — POST /signin with username: 'x' (fails Joi min-length validation).
// Use expectRejected(res.status) — NOT .toBe(400) alone.
// Why: the server may return 429 (rate limited) instead of 400 after a few runs.
// Both mean the request was correctly rejected.
// Hint: import { expectRejected } from '../../../src/test-utils'
it('invalid signin: expectRejected accepts 400 or 429', async () => {
  // write your code here
});

// TODO 5 — Call GET /currentuser TWICE with the same sessionCookie.
// Assert that both responses return status 200.
// Assert that both responses have the same username.
// This demonstrates idempotency: the same authenticated request always returns the same result.
it('GET /currentuser is idempotent — same result twice', async () => {
  // write your code here
});

// TODO 6 — POST /signin with invalid credentials (username: 'x', password: 'y').
// Assert the status with expectRejected(res.status).
// If the status is 400 (not rate-limited), assert that res.data.message matches /\S+/.
// /\S+/ matches one or more non-whitespace characters — confirms message is not blank.
it('toMatch — error message matches /\\S+/', async () => {
  // write your code here
});

// TODO 7 — Use the token variable captured in beforeAll (from signin response).
// Assert that token is toBeTypeOf('string').
// Hint: guard with if (token) in case signin was rate-limited and token is ''.
// toBeTypeOf is a Vitest-specific matcher — cleaner than typeof token === 'string'.
it('toBeTypeOf — signin token is a string', () => {
  // write your code here
});
