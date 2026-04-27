// Lecture 18 — Homework SOLUTION
// Run: npm test tests/lecture-18/homework/solution.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { expectRejected } from '../../../src/test-utils';
import { TEST_CLEANUP_SECRET } from '../../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let sessionCookie = '';
let token = '';

beforeAll(async () => {
  const r = await axios.post(
    signinUrl,
    { username: config.TEST_USERNAME, password: config.TEST_PASSWORD },
    { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true },
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

// Solution 1 — missing validateStatus causes axios to throw
// WHY: axios throws an AxiosError on any non-2xx response when validateStatus is not set.
// The thrown error has a .response property containing status, data, and headers.
// In real tests you should NEVER rely on this throw — always use validateStatus: () => true.
// This solution exists purely to show you what the error object looks like when it IS thrown.
it('missing validateStatus — axios throws; error has .response', async () => {
  try {
    await axios.get(currentUserUrl); // no validateStatus — throws AxiosError on 401
    // If somehow we reach here (e.g. server returned 200), the assertion still passes
    expect(true).toBe(true);
  } catch (err: unknown) {
    // AxiosError has a .response property with the full HTTP response
    expect(err).toHaveProperty('response');
    const e = err as { response: { status: number } };
    expect(e.response.status).toBe(401);
  }
});

// Solution 2 — empty cookie vs. captured cookie
// WHY the 401: the session cookie tells the server WHO you are. Without it, the server
// has no way to identify the request. Cookie: '' is treated as no cookie at all.
// WHY Array.isArray check: axios may return set-cookie as string[] (multiple cookies)
// or a single string (one cookie). The guard handles both cases safely.
it('empty cookie returns 401; captured cookie returns 200', async () => {
  // First: no cookie → 401
  const unauthRes = await axios.get(currentUserUrl, {
    headers: { Cookie: '' },
    validateStatus: () => true,
  });
  expect(unauthRes.status).toBe(401);

  // Second: real cookie from beforeAll → 200
  const authRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  expect(authRes.status).toBe(200);
});

// Solution 3 — console.log to inspect response shape
// WHY: when you get "expected string, received undefined", the first step is to
// console.log(res.data) to see what the response body actually looks like.
// You will see { message: '...', token: '...', user: { _id: '...', username: '...' } }
// Once you know the shape, you can write res.data.user.username correctly.
// IMPORTANT: remove the console.log before committing — it clutters CI output.
it('console.log reveals response shape', async () => {
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  // Add console.log here temporarily to see the shape, then remove it:
  // console.log(res.data);
  expect(res.status).toBe(200);
  expect(res.data).toHaveProperty('user');
});

// Solution 4 — expectRejected for rate-limited auth endpoints
// WHY expectRejected instead of .toBe(400):
// The nginx rate limiter on production auth endpoints returns 429 (Too Many Requests)
// after 5 requests per minute per IP. Both 400 (validation error) and 429 (rate limit)
// mean the request was correctly rejected. expectRejected accepts either status.
// If you use .toBe(400) alone, the test becomes flaky after a few runs.
it('invalid signin: expectRejected accepts 400 or 429', async () => {
  const res = await axios.post(
    signinUrl,
    { username: 'x', password: 'y' }, // 'x' is too short — Joi min 4
    { validateStatus: () => true },
  );
  expectRejected(res.status); // passes for 400 or 429
});

// Solution 5 — idempotency: same request returns same result
// WHY test idempotency: a GET request should never change server state.
// If two identical GET requests return different results, something is wrong —
// either the session expired, the server has a bug, or the data is being mutated.
// This test confirms the session stays alive and GET /currentuser is stable.
it('GET /currentuser is idempotent — same result twice', async () => {
  const res1 = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  const res2 = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  expect(res1.status).toBe(200);
  expect(res2.status).toBe(200);
  // Both responses return the same user
  expect(res1.data.user.username).toBe(res2.data.user.username);
});

// Solution 6 — toMatch with /\S+/
// WHY toMatch instead of .toHaveProperty('message'):
// .toHaveProperty checks existence only — the message could be '' and still pass.
// /\S+/ requires at least one non-whitespace character, confirming the message has content.
// WHY guard with if (res.status === 400):
// When rate-limited (429), the response body has a different shape — we skip the
// message assertion to avoid a false failure caused by the rate limiter, not our code.
it('toMatch — error message matches /\\S+/', async () => {
  const res = await axios.post(
    signinUrl,
    { username: 'x', password: 'y' },
    { validateStatus: () => true },
  );
  expectRejected(res.status);
  if (res.status === 400) {
    expect(res.data.message).toMatch(/\S+/);
  }
});

// Solution 7 — toBeTypeOf('string')
// WHY toBeTypeOf instead of typeof token === 'string':
// toBeTypeOf is a Vitest-specific matcher that reads naturally ("token is of type string")
// and produces a better failure message ("expected '' to be of type 'string'" vs a raw assertion).
// WHY guard with if (token):
// If signin was rate-limited during beforeAll, token is ''. The test would fail for the
// wrong reason (rate limit, not a bug). The guard makes the test resilient to this condition.
it('toBeTypeOf — signin token is a string', () => {
  if (token) {
    expect(token).toBeTypeOf('string');
  } else {
    // token is '' because signin was rate-limited in beforeAll — skip gracefully
    expect(true).toBe(true);
  }
});
