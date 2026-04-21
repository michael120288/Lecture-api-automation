# What Is API Testing?

**Related topics:** [REST](rest.md) | [HTTP Requests](http-requests.md) | [HTTP Status Codes](http-status-codes.md) | [Positive Testing](positive-testing.md) | [Negative Testing](negative-testing.md)

---

## 1. What Is an API?

An **API** (Application Programming Interface) is a contract between two pieces of software. It defines how one system can ask another to do something — what to send, what to expect back, and what errors might occur.

In web development, the term usually refers to an **HTTP API**: a server that accepts HTTP requests and responds with structured data (almost always JSON).

When you use a mobile banking app, the app is not the bank. The app sends requests to the bank's API: "get this account's balance", "transfer this amount", "list recent transactions". The bank's servers do the actual work and send data back.

The Chatty application works the same way:

```
Browser/App (client)
       |
       | HTTP request: POST /signin { username, password }
       v
Chatty API server (https://api.codeandtest.com/api/v1)
       |
       | Validates credentials, reads database
       v
HTTP response: 200 { message, user, token }
       |
       v
Browser/App receives structured data and renders the UI
```

The frontend (React app) and the API server are completely separate. The frontend never touches the database — it only talks to the API.

---

## 2. What Is API Testing?

**API testing** means calling the API directly — without going through any user interface — and verifying that the responses are correct.

Instead of opening a browser, clicking a "Sign In" button, and checking whether the dashboard loads, you write code that:

1. Sends an HTTP request to `POST /signin`
2. Receives the JSON response
3. Asserts that the status code is `200`
4. Asserts that the response body contains a `user` object with the right shape
5. Asserts that a `set-cookie` header was set

That is the entire test. No browser, no clicking, no waiting for pixels.

In this course you write those requests with **Axios** and those assertions with **Vitest**.

---

## 3. The Testing Pyramid

The testing pyramid is a mental model for how to divide your test effort across different levels.

```
         /\
        /  \
       / E2E\         UI / end-to-end tests (few)
      /------\
     / API    \       API / integration tests (some)
    /----------\
   /  Unit      \     Unit tests (many)
  /--------------\
```

| Level | What it tests | Tools | Speed | Cost of failure |
|-------|--------------|-------|-------|-----------------|
| Unit | A single function or class in isolation | Jest, Vitest | Very fast | Low |
| API / Integration | A complete request/response cycle across real services | Vitest + Axios | Medium | Medium |
| E2E / UI | A user workflow through the real browser | Playwright, Cypress | Slow | High |

The pyramid shape is intentional: you want many cheap unit tests at the bottom and fewer expensive end-to-end tests at the top.

**API tests sit in the middle.** They are:
- Faster than UI tests (no browser rendering)
- More realistic than unit tests (they test the full request pipeline)
- Easier to maintain than UI tests (API contracts change less often than UIs)
- Able to test every endpoint, every error case, without needing a complete user interface

---

## 4. API Testing vs UI Testing vs Unit Testing

### Unit Testing

A unit test isolates a single function and verifies its logic.

```typescript
// Unit test — no HTTP, no database
function formatUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

test('formatUsername lowercases and trims', () => {
  expect(formatUsername('  Alice  ')).toBe('alice');
});
```

Unit tests are deterministic and extremely fast. Their weakness is that they cannot tell you whether the whole system works together.

### API Testing

An API test sends a real HTTP request to a running server.

```typescript
// API test — real network call, real server, real database
test('POST /signin returns 200 with valid credentials', async () => {
  const res = await axios.post(`${BASE_URL}/signin`, {
    username: 'vitestmike',
    password: 'Vitest@123456',
  }, { validateStatus: () => true });

  expect(res.status).toBe(200);
  expect(res.data.message).toBe('User login successfully');
});
```

This test proves the controller, validation layer, database query, and session-cookie logic all work together.

### UI / End-to-End Testing

A UI test drives a real browser through a real user workflow.

```typescript
// E2E test with Playwright
await page.fill('[name="username"]', 'vitestmike');
await page.fill('[name="password"]', 'Vitest@123456');
await page.click('button[type="submit"]');
await expect(page).toHaveURL('/home');
```

UI tests are the most realistic but also the slowest, most brittle, and hardest to debug. A broken CSS selector can fail a test that has nothing to do with the actual functionality being verified.

### Comparison Table

| Dimension | Unit | API | UI/E2E |
|-----------|------|-----|--------|
| Speed | Very fast (<1ms) | Medium (50ms–2s) | Slow (2s–30s) |
| Realistic | Low | High | Very high |
| Maintenance | Low | Medium | High |
| Finds integration bugs | No | Yes | Yes |
| Finds UI layout bugs | No | No | Yes |
| Runs without a server | Yes | No | No |

---

## 5. Why API Testing Matters

### Business logic lives in the API

The API enforces your application's rules. "A user cannot delete another user's post" is not enforced by a React button — it is enforced by a `403 Forbidden` response from the server. UI tests can only verify that the button is hidden; API tests verify that the rule is actually enforced even when someone bypasses the UI entirely.

### APIs are consumed by multiple clients

The Chatty backend is used by the web frontend, potentially a mobile app, and third-party integrations. The API contract is shared across all of them. A broken API breaks everything downstream simultaneously.

### API bugs are cheaper to catch early

Fixing a bug that an API test catches during development takes minutes. Fixing the same bug after it reaches production costs orders of magnitude more — in engineering time, customer support, and trust.

### Regression coverage without browser complexity

Once an API test is written, it runs in milliseconds on every CI build. It does not depend on browser versions, rendering engines, network speed fluctuations, or animation timers.

---

## 6. What You Can Assert in an API Test

Every HTTP response has three parts you can assert against:

### 6.1 Status Code

The numeric code that tells you whether the request succeeded and what kind of success or failure occurred.

```typescript
expect(res.status).toBe(200);      // OK
expect(res.status).toBe(201);      // Created
expect(res.status).toBe(400);      // Bad Request
expect(res.status).toBe(401);      // Unauthorized
expect(res.status).toBe(404);      // Not Found
```

### 6.2 Response Body

The JSON payload. You can assert the exact shape, the types of fields, and specific values.

```typescript
// Assert a specific value
expect(res.data.message).toBe('User login successfully');

// Assert an object has the right shape (other keys allowed)
expect(res.data.user).toMatchObject({
  username: 'Vitestmike',
  email: 'mike@test.com',
});

// Assert a field exists and is the right type
expect(typeof res.data.token).toBe('string');
expect(res.data.token.length).toBeGreaterThan(0);

// Assert a field is NOT present (e.g., password must never be in response)
expect(res.data.user.password).toBeUndefined();
```

### 6.3 Response Headers

Metadata about the response. Especially important for authentication (cookies) and content type.

```typescript
// Assert the server sets a session cookie
expect(res.headers['set-cookie']).toBeDefined();
expect(res.headers['set-cookie'][0]).toContain('session=');

// Assert the response is JSON
expect(res.headers['content-type']).toContain('application/json');
```

### 6.4 Response Timing

How long the request took. Useful for performance smoke tests and SLA validation.

```typescript
const start = Date.now();
const res = await axios.post(`${BASE_URL}/signin`, body, { validateStatus: () => true });
const duration = Date.now() - start;

expect(duration).toBeLessThan(2000); // should respond within 2 seconds
```

---

## 7. A Complete Example: Testing POST /signin

Here is a full working test using the Chatty API.

```typescript
import axios from 'axios';
import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://api.codeandtest.com/api/v1';

describe('POST /signin', () => {
  it('returns 200 and a user object with valid credentials', async () => {
    const res = await axios.post(
      `${BASE_URL}/signin`,
      {
        username: 'vitestmike',
        password: 'Vitest@123456',
      },
      { validateStatus: () => true }
    );

    // Assert status
    expect(res.status).toBe(200);

    // Assert message
    expect(res.data.message).toBe('User login successfully');

    // Assert user shape
    expect(res.data.user).toMatchObject({
      username: 'Vitestmike',   // title-cased by the server
      email: expect.any(String),
    });

    // Assert token exists
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.length).toBeGreaterThan(10);

    // Assert password is NOT exposed
    expect(res.data.user.password).toBeUndefined();

    // Assert session cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies![0]).toContain('session=');
  });

  it('returns 400 with wrong password', async () => {
    const res = await axios.post(
      `${BASE_URL}/signin`,
      {
        username: 'vitestmike',
        password: 'wrongpassword',
      },
      { validateStatus: () => true }
    );

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid credentials');
  });
});
```

### Why `validateStatus: () => true`?

By default, Axios throws an exception for any status code outside 2xx. This means a `400` response would crash your test with an unhandled promise rejection instead of letting you assert on it.

Setting `validateStatus: () => true` tells Axios to treat every response as a success at the network level, so you always get the response object back regardless of status code. Your assertions then determine whether the test passes or fails.

This is the standard pattern throughout this course.

---

## 8. How This Course Is Structured

The course builds from simple to complex:

| Lectures | Topic | New concepts |
|----------|-------|-------------|
| 01–02 | Tooling + first signin test | Axios, Vitest, `validateStatus` |
| 03 | Signup + cleanup | Cookies, `beforeAll`/`afterAll`, test isolation |
| 04 | Current user + session | Cookie forwarding, `GET` assertions |
| 05 | Posts CRUD | `POST`/`PATCH`/`DELETE`, 201 vs 200 |
| 06 | Reactions | Complex request bodies |
| 07 | Comments | Nested resource IDs |
| 08 | User profile | `PUT`, boundary tests |
| 09 | Followers | Multi-user setup, relational assertions |

Each lecture introduces new HTTP concepts, new assertion patterns, and new edge cases. The reference files in this `topics/` directory give you the theory you need to understand what you are doing and why.

---

## 9. Common Beginner Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Not setting `validateStatus: () => true` | Test crashes on 4xx instead of asserting | Always set it for every Axios call |
| Asserting `res.data` as a whole string | `res.data` is an object, not text | Access `res.data.message`, `res.data.user`, etc. |
| Forgetting to `await` the axios call | `res` is a Promise, not a response | Always `await axios.post(...)` |
| Checking status in the body instead of `res.status` | `res.data.statusCode` is an echo; the real code is `res.status` | Use `res.status` for status assertions |
| Not isolating test users | Tests interfere with each other | Create a unique user per test file, clean up in `afterAll` |

---

## Related Topics

- [REST](rest.md) — what REST is and how Chatty's endpoints follow REST conventions
- [HTTP Requests](http-requests.md) — anatomy of requests and responses, all five HTTP methods
- [HTTP Status Codes](http-status-codes.md) — every code used in the Chatty API explained
- [HTTP Headers](http-headers.md) — Content-Type, Authorization, Cookie, and set-cookie
- [Positive Testing](positive-testing.md) — what to assert on happy-path success responses
- [Negative Testing](negative-testing.md) — testing error cases and validations
- [Boundary Testing](boundary-testing.md) — min/max values, off-by-one errors

## Official Documentation

- [Martin Fowler — Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [ISTQB — Software testing glossary](https://glossary.istqb.org/)
- [Postman — What is API testing?](https://www.postman.com/api-testing/)
- [SmartBear — API testing guide](https://smartbear.com/learn/api-testing/what-is-api-testing/)
