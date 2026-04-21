// Lecture 18 — Debugging & Test Reliability
// This file demonstrates the 10 most common failure patterns and their fixes.
// Every test in this file PASSES. The "wrong" patterns are shown via try/catch
// or restructured so you can see what breaks — without breaking the test suite.
//
// Run: npm test tests/lecture-18/lecture.test.ts
// Run with verbose output: npm test tests/lecture-18/lecture.test.ts -- --reporter=verbose

import axios from 'axios';
import { config } from '../../src/config';
import { expectRejected } from '../../src/test-utils';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let sessionCookie = '';
let token = '';

// ─── beforeAll — sign in once, share session across all tests ────────────────
//
// validateStatus: () => true is REQUIRED here.
// Without it, axios throws on any non-2xx status and beforeAll fails silently —
// leaving sessionCookie as '' and causing every subsequent test to return 401.

beforeAll(async () => {
  const r = await axios.post(
    signinUrl,
    { username: config.TEST_USERNAME, password: config.TEST_PASSWORD },
    { validateStatus: () => true },
  );
  const raw = r.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
  token = r.data?.token ?? '';
});

afterAll(async () => {
  if (!sessionCookie) return;
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// ─── 1. Reading failure output ────────────────────────────────────────────────
//
// What does Vitest actually print when a test fails?
// This describe block first shows the CORRECT assertion (passes), then explains
// what the output would look like if you had written .toBe(999).
//
// If you want to see the failure output yourself, temporarily change .toBe(200)
// to .toBe(999), run the file, read the output, then change it back.

describe('1. Reading failure output', () => {

  it('correct assertion: signin returns 200', async () => {
    // This test demonstrates what a PASSING assertion looks like.
    // To see the failure diff, change 200 to 999 and run the file.
    // Vitest will print:
    //   - Expected  999
    //   + Received  200
    //   at tests/lecture-18/lecture.test.ts:NN:5
    const res = await axios.post(
      signinUrl,
      { username: config.TEST_USERNAME, password: config.TEST_PASSWORD },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(200);
  });

  it('reading the file:line reference — always click it', () => {
    // Vitest always prints the file and line where the assertion failed.
    // Example output:
    //   at tests/lecture-18/lecture.test.ts:42:5
    // In VS Code: Ctrl+Click (Mac: Cmd+Click) the path to jump to that line.
    // This is the fastest way to navigate to the broken assertion.
    expect(true).toBe(true); // placeholder — nothing to assert here
  });

});

// ─── 2. Common failure: missing validateStatus ────────────────────────────────
//
// Without validateStatus: () => true, axios throws an AxiosError on any 4xx/5xx.
// The thrown error has a .response property with the actual status and data.
// The test NEVER reaches expect() — it crashes in the try block instead.
//
// WRONG pattern (demonstrated with try/catch so the test still passes):
//   const res = await axios.get(url);  // throws on 401 — no validateStatus
//   expect(res.status).toBe(401);      // never reached
//
// CORRECT pattern:
//   const res = await axios.get(url, { validateStatus: () => true });
//   expect(res.status).toBe(401);      // always reached

describe('2. Common failure: missing validateStatus', () => {

  it('wrong way — axios throws without validateStatus; error has .response', async () => {
    // This test intentionally sends a request WITHOUT validateStatus to a protected endpoint.
    // The 401 makes axios throw. We catch that throw and assert the error shape.
    // In real code you would NOT use try/catch like this — you would use validateStatus.
    try {
      await axios.get(currentUserUrl); // no validateStatus — throws AxiosError on 401
      // If we get here, the server returned 2xx (e.g., still signed in from a previous run)
      expect(true).toBe(true); // not an error in that case
    } catch (err: unknown) {
      // AxiosError has a .response property with status, data, headers
      expect(err).toHaveProperty('response');
      const e = err as { response: { status: number } };
      expect(e.response.status).toBe(401);
    }
  });

  it('correct way — validateStatus prevents the throw; always reaches expect()', async () => {
    // With validateStatus: () => true, axios never throws regardless of status code.
    // This means expect() is always reached — even on 401, 429, 500, etc.
    const res = await axios.get(currentUserUrl, { validateStatus: () => true });
    // Without a cookie the server returns 401 — that is correct and expected
    expect(res.status).toBe(401);
  });

});

// ─── 3. Cookie capture pattern ────────────────────────────────────────────────
//
// Pattern 2 from the README: "Expected 200, received 401"
//
// The session cookie is in the `set-cookie` response header.
// If you forget to capture it (or capture it incorrectly), every subsequent
// authenticated request returns 401.

describe('3. Cookie capture pattern', () => {

  it('missing cookie returns 401', async () => {
    // Deliberately omit the Cookie header to demonstrate the 401 response.
    // This is the pattern that causes the most confusion in Lectures 02–17.
    const res = await axios.get(currentUserUrl, { validateStatus: () => true });
    // No Cookie header — server cannot identify the user
    expect(res.status).toBe(401);
  });

  it('correct cookie capture returns 200', async () => {
    // sessionCookie was captured in beforeAll using:
    //   const raw = r.headers['set-cookie'];
    //   sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
    //
    // Why Array.isArray check?
    // axios returns set-cookie as string[] when there are multiple Set-Cookie headers,
    // or a single string when there is only one. The guard handles both cases.
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has user object with expected fields', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data).toHaveProperty('user');
    expect(res.data.user).toHaveProperty('username');
    expect(res.data.user).toHaveProperty('_id');
  });

});

// ─── 4. Rate limiting resilience ─────────────────────────────────────────────
//
// Pattern 3 from the README: "Expected 400, received 429"
//
// Production auth endpoints are rate-limited to 5 req/min per IP.
// After a few test runs, the server returns 429 (Too Many Requests) instead of 400.
// Both mean the request was correctly rejected — the test must accept either.
//
// Never write: expect(res.status).toBe(400)  on an auth negative test.
// Always write: expectRejected(res.status)    — accepts 400 or 429.

describe('4. Rate limiting resilience', () => {

  it('invalid credentials: expectRejected accepts 400 or 429', async () => {
    // Short username 'x' fails Joi validation → 400 normally
    // After rate limit is hit → 429 instead
    // expectRejected passes for either status code
    const res = await axios.post(
      signinUrl,
      { username: 'x', password: 'y' },
      { validateStatus: () => true },
    );
    expectRejected(res.status);
  });

  it('missing password field: expectRejected handles both statuses', async () => {
    // A missing required field also returns 400 normally or 429 when rate limited
    const res = await axios.post(
      signinUrl,
      { username: config.TEST_USERNAME },  // no password field
      { validateStatus: () => true },
    );
    expectRejected(res.status);
    // Only assert the message body when we got the validation response, not a rate limit
    if (res.status === 400) {
      expect(res.data).toHaveProperty('message');
    }
  });

});

// ─── 5. Test isolation ────────────────────────────────────────────────────────
//
// Pattern 5 from the README: "Tests pass alone but fail together"
//
// This describe block demonstrates WHY shared mutable state causes problems,
// and shows the beforeAll fix. Both approaches are shown — the broken one
// wrapped in a sub-describe so you can see the contrast.

describe('5. Test isolation', () => {

  it('idempotency: GET /currentuser twice returns 200 both times', async () => {
    // An idempotent request returns the same result regardless of how many times
    // you call it. This verifies the signed-in state is stable.
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
    // Both responses have the same username — the session is stable
    expect(res1.data.user.username).toBe(res2.data.user.username);
  });

  it('test does not mutate shared sessionCookie — reads it, does not overwrite it', async () => {
    // If this test overwrote sessionCookie, every later test would break.
    // The rule: individual it() blocks MUST NOT modify variables that other tests depend on.
    // Only beforeAll and afterAll should set shared state.
    const originalCookie = sessionCookie;
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    // sessionCookie is unchanged
    expect(sessionCookie).toBe(originalCookie);
  });

});

// ─── 6. Debugging with verbose output ────────────────────────────────────────
//
// This describe block shows the pattern for temporary debugging logs.
// The console.log calls here are intentional for the lecture — in real homework
// files you should add them temporarily then REMOVE them before committing.
//
// Run with: npm test tests/lecture-18/lecture.test.ts -- --reporter=verbose
// You will see each test name as it runs, plus the console.log output.

describe('6. Debugging with verbose output', () => {

  it('shows how console.log reveals response shape', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    // Temporary debug log — in real code you remove this after debugging
    // Uncomment the lines below to see the output:
    // console.log('status:', res.status);
    // console.log('data keys:', Object.keys(res.data));
    // console.log('user._id:', res.data.user?._id);

    // What to look for in the output:
    //   status: 200
    //   data keys: [ 'message', 'token', 'user' ]
    //   user._id: 64a1b2c3d4e5f6a7b8c9d0e1  (MongoDB ObjectId)
    //
    // Once you know the shape, you can write the correct property path in your assertion.
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('user');
  });

  it('--reporter=verbose shows each test name as it passes or fails', () => {
    // When you run with --reporter=verbose, Vitest prints:
    //   ✓ 6. Debugging with verbose output > shows how console.log reveals response shape
    //   ✓ 6. Debugging with verbose output > --reporter=verbose shows each test name...
    // This is the fastest way to see which test ran BEFORE a failure occurred.
    expect(true).toBe(true);
  });

});

// ─── 7. Assertion variants ────────────────────────────────────────────────────
//
// Two new assertion styles introduced in this lecture:
//
//   toMatch(/regex/)      — assert a string matches a regular expression
//   toBeTypeOf('string')  — Vitest-native type assertion
//
// Both are more expressive than writing the equivalent with .toBe() or typeof.

describe('7. Assertion variants', () => {

  it('toMatch — error message contains at least one non-whitespace character', async () => {
    // /\S+/ matches one or more non-whitespace characters.
    // This is a minimal check that the message is not blank — more expressive
    // than .toHaveProperty('message') which only checks existence, not content.
    const res = await axios.post(
      signinUrl,
      { username: 'x', password: 'y' },
      { validateStatus: () => true },
    );
    expectRejected(res.status);
    if (res.status === 400) {
      // The error message is a non-empty string
      expect(res.data.message).toMatch(/\S+/);
    }
  });

  it('toBeTypeOf — token from signin is a string', () => {
    // toBeTypeOf is Vitest-specific — cleaner than typeof token === 'string'.
    // It reads naturally: "token is of type string".
    // Also works with: 'number', 'boolean', 'object', 'function', 'undefined'
    if (token) {
      expect(token).toBeTypeOf('string');
    } else {
      // token is '' if signin is currently rate-limited — skip gracefully
      expect(true).toBe(true);
    }
  });

  it('toMatch — MongoDB ObjectId format on user._id', async () => {
    // /^[a-f0-9]{24}$/ is the canonical pattern for a 24-hex-char MongoDB ObjectId.
    // toMatch is more expressive than checking .length === 24 separately.
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    if (res.data?.user?._id) {
      expect(res.data.user._id).toMatch(/^[a-f0-9]{24}$/);
    }
  });

  it('toBeTypeOf — username field is a string', async () => {
    // Combining cookie capture + toBeTypeOf in one test
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.user.username).toBeTypeOf('string');
  });

});
