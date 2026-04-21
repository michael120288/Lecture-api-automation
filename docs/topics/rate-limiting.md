# Rate Limiting

## What is Rate Limiting?

Rate limiting is a technique where a server restricts how many requests a client can make within a given time window. When the limit is exceeded, the server rejects further requests until the window resets.

Rate limiting exists to:
- Protect against brute-force attacks (trying thousands of passwords per second)
- Prevent abuse and denial-of-service (flooding the server with requests)
- Manage infrastructure costs (every request costs compute time)
- Enforce fair use in multi-tenant systems

Without rate limiting on authentication endpoints, an attacker could systematically try every password combination against a known username.

---

## HTTP 429 Too Many Requests

When you exceed a rate limit, the server responds with HTTP status `429 Too Many Requests`:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "message": "Too many requests, please try again later."
}
```

The `429` status code is standardized in [RFC 6585](https://tools.ietf.org/html/rfc6585). Some servers use `503 Service Unavailable` for rate limiting (which is incorrect) — Chatty uses the correct `429`.

---

## The Retry-After Header

When a server rate-limits you, it may include a `Retry-After` header telling you when the limit resets:

```
Retry-After: 60
```

This value is in seconds. After 60 seconds, you may try again.

Not all rate-limited responses include this header. Chatty's production server includes it for the nginx-level limiter but not always for the Express-level one. Your tests should not depend on this header being present — check only the status code.

---

## Chatty's Two-Layer Rate Limiting

The production Chatty API at `api.codeandtest.com` has rate limiting at two levels:

| Layer | Technology | Limit | Window |
|-------|-----------|-------|--------|
| Reverse proxy | nginx | ~5 requests | per minute |
| Application | Express (`express-rate-limit`) | 20 requests | per 15 minutes |

The nginx limit is more aggressive and is the one you are most likely to hit during test runs. Authentication endpoints (`/signin`, `/signup`, `/forgot-password`) are the most heavily limited.

Other endpoints (profile updates, posts, reactions) have more generous limits and you are unlikely to trigger them in normal test runs.

---

## Why Tests Trigger Rate Limits

Consider a test suite that runs these test files sequentially:

- Lecture 1: makes 7 individual signin requests in its boundary value tests
- Lecture 2: makes 3 individual signin requests in its negative tests
- Lecture 6: makes 4 individual signin requests in its negative tests

Within a few test runs against the production server, you have exhausted the 20-requests-per-15-minutes limit on `/signin`. The 16th request returns 429 instead of 400.

The nginx limit is even tighter — 5 requests per minute — so rapid fire test runs will hit it immediately.

---

## The `expectRejected` Pattern

The course-wide solution to rate limiting in tests is the `expectRejected` helper defined in `src/test-utils.ts`:

```typescript
// src/test-utils.ts
export function expectRejected(status: number): void {
  expect([400, 429]).toContain(status);
}
```

Usage in tests:

```typescript
it('wrong credentials are rejected', async () => {
  const res = await axios.post(signinUrl, {
    username: 'notarealuser',
    password: 'wrongpassword',
  }, { validateStatus: () => true });

  // This passes whether the server returned 400 (validation error)
  // or 429 (rate limited) — both mean "correctly rejected"
  expectRejected(res.status);
});
```

**Why this is better than `expect(res.status).toBe(400)`:**

With `.toBe(400)`:
- First run: passes (server returns 400)
- Second run: fails (server returns 429)
- Your test is flaky not because your code broke but because the rate limit reset

With `expectRejected(res.status)`:
- First run: passes (400 is in `[400, 429]`)
- Second run: passes (429 is in `[400, 429]`)
- The test is deterministic against a rate-limited production server

---

## Guarding Message Assertions

When you receive 429, the error message is the rate limiter's generic text, not Chatty's validation error. You must guard message assertions:

```typescript
it('wrong credentials return the correct error message', async () => {
  const res = await axios.post(signinUrl, {
    username: 'notarealuser',
    password: 'WrongPass@999',
  }, { validateStatus: () => true });

  expectRejected(res.status);

  // Only check the specific message if we got a 400 — not a 429
  if (res.status === 400) {
    expect(res.data.message).toBe('Invalid credentials');
  }
});
```

Without the `if (res.status === 400)` guard, this test would fail on a 429 response because the message would be `"Too many requests..."` instead of `"Invalid credentials"`.

---

## Strategies to Avoid Rate Limits in Test Suites

### 1. `fileParallelism: false` in vitest.config.ts

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: false,  // Run test files sequentially, not in parallel
  },
});
```

Running test files in parallel would send all their signin requests simultaneously, hitting the rate limit immediately. Sequential execution spreads requests across time.

### 2. Share One Signin Request Per File

The most effective strategy: make **one** signin request per test file and share the session cookie across all tests in that file.

```typescript
// BAD: Each test signs in separately — 7 requests for 7 tests
describe('Tests', () => {
  it('test 1', async () => {
    const loginRes = await axios.post(signinUrl, credentials, ...);
    // uses loginRes
  });
  it('test 2', async () => {
    const loginRes = await axios.post(signinUrl, credentials, ...);
    // uses loginRes
  });
});

// GOOD: Sign in once, share across all tests — 1 request for 7 tests
let sessionCookie = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

describe('Tests', () => {
  it('test 1', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    // uses res
  });
  it('test 2', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    // uses res
  });
});
```

This is the pattern established in Lecture 1 and used throughout the entire course.

### 3. Add Delays Between Requests (Last Resort)

If you must make multiple requests in rapid succession:

```typescript
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

it('multiple boundary tests', async () => {
  for (const input of boundaryInputs) {
    const res = await axios.post(signinUrl, input, { validateStatus: () => true });
    expectRejected(res.status);
    await sleep(500); // 500ms between requests
  }
});
```

This is a last resort. Prefer reducing the number of requests.

### 4. Run Against Localhost

The cleanest solution: run tests against a local Chatty server, which has no rate limiting. The rate limiter is a production concern. Localhost tests can assert exact 400 responses without worrying about 429.

---

## Exponential Backoff

Exponential backoff is a strategy for retrying failed requests that waits progressively longer between attempts:

```
Attempt 1: fail → wait 1 second
Attempt 2: fail → wait 2 seconds
Attempt 3: fail → wait 4 seconds
Attempt 4: fail → wait 8 seconds
```

This is the standard approach in production code for handling 429 responses. In tests you would not implement retry logic — instead you would fix the root cause (too many requests). Understanding exponential backoff is important for production API clients.

---

## Rate Limiting in Practice: What You Will See

During this course you will typically see:

```
Expected: 400
Received: 429
```

This error in a test means you hit the rate limit. It does not mean your test logic is wrong. Solutions:

1. Wait 15 minutes and re-run
2. Ensure `fileParallelism: false` is set
3. Reduce the number of standalone signin requests in your tests
4. Use `expectRejected()` instead of `.toBe(400)` for negative auth tests

---

## Rate Limiting Does Not Affect These Tests

Not all tests in the course hit rate-limited endpoints. These are safe to run as many times as you like:

- `GET /currentuser` with a valid session cookie
- `GET /post/all/:page`
- `PUT /user/profile/basic-info`
- `PUT /user/profile/settings`
- `POST /post`
- `DELETE /post/:id`
- `GET /user/:id`

Rate limiting is concentrated on auth-flow endpoints that could be used for brute-force attacks.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `expect(status).toBe(400)` on signin negative tests | Flaky — fails when rate limited | Use `expectRejected(status)` |
| Asserting specific message without status guard | Fails with wrong message when 429 | Add `if (res.status === 400)` guard |
| Running all lecture files in parallel | Immediate 429 on all auth endpoints | Set `fileParallelism: false` |
| Re-signing in per test | Exhausts rate limit quickly | Sign in once in `beforeAll`, share cookie |
| Not accounting for rate limits in CI pipelines | Tests pass locally, fail in CI | Same fixes apply; CI runs fast and hits limits sooner |

---

## Related Topics

- [Cookies and Sessions](cookies-sessions.md)
- [JWT — JSON Web Tokens](jwt.md)
- [SSO — Single Sign-On](sso.md)

## Official Documentation

- [MDN — 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [MDN — Retry-After header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After)
- [IETF — Rate limiting headers (draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
