# HTTP Status Codes

**Related topics:** [HTTP Requests](http-requests.md) | [HTTP Headers](http-headers.md) | [Positive Testing](positive-testing.md) | [Negative Testing](negative-testing.md) | [REST](rest.md)

---

## 1. What Is a Status Code?

Every HTTP response begins with a three-digit numeric status code. It is the server's summary judgment of what happened: did the request succeed, did the client do something wrong, or did the server fail?

```
HTTP/1.1 200 OK
         ^^^
         This is the status code you assert on in every test
```

The numeric code is the authoritative signal. The text after it ("OK", "Created", "Not Found") is called the **reason phrase** and is purely informational — some servers omit or customize it. Always assert on the numeric code, never on the reason phrase.

In Vitest + Axios:

```typescript
// Correct
expect(res.status).toBe(200);

// Wrong — the reason phrase is not part of res.status
expect(res.status).toBe('200 OK');  // TypeError — res.status is a number
```

---

## 2. The Five Status Code Families

Status codes are grouped into five families by their first digit.

| Family | Range | Meaning |
|--------|-------|---------|
| 1xx | 100–199 | Informational — request received, continuing |
| 2xx | 200–299 | Success — the action was received, understood, and accepted |
| 3xx | 300–399 | Redirection — further action needed to complete the request |
| 4xx | 400–499 | Client Error — the request contains bad syntax or cannot be fulfilled |
| 5xx | 500–599 | Server Error — the server failed to fulfil a valid request |

### What you will see in this course

| Family | Codes | When |
|--------|-------|------|
| 2xx | 200, 201 | Successful requests |
| 4xx | 400, 401, 403, 404, 429 | Client errors (wrong input, no auth, not found, rate limited) |
| 5xx | 500 | Rare — server crash or upstream failure |

You will not encounter 1xx or 3xx in the Chatty API tests.

---

## 3. The 2xx Family — Success

### 200 OK

The request succeeded. The response body contains the requested data or confirmation of the action.

**In Chatty, 200 is returned for:**

```typescript
// Sign in (action — not a new resource creation)
POST /signin → 200

// Get posts
GET /post/all/:page → 200

// Get current user
GET /currentuser → 200

// Get comments
GET /post/comments/:postId → 200

// Post updated
PATCH /post/:postId → 200

// Post deleted
DELETE /post/:postId → 200

// Reaction added
POST /post/reaction → 200

// Comment created (action on a post — not a standalone resource creation)
POST /post/comment → 200

// Profile updated
PUT /user/profile/basic-info → 200

// Follow/unfollow
PUT /user/follow/:followerId → 200

// Sign out
POST /signout → 200
```

**Asserting 200:**

```typescript
const res = await axios.get(`${BASE_URL}/post/all/1`, {
  headers: { Cookie: cookie },
  validateStatus: () => true,
});

expect(res.status).toBe(200);
expect(res.data.message).toBe('All posts');
expect(Array.isArray(res.data.posts)).toBe(true);
```

### 201 Created

The request succeeded and a new resource was created. The response may include a `Location` header pointing to the new resource, though Chatty does not use `Location`.

**In Chatty, 201 is returned for:**

```typescript
// New user account created
POST /signup → 201

// New post created
POST /post → 201
```

Notice that `POST /post/comment` returns `200`, not `201`. This is an intentional design decision: comments are actions performed on a post, not independent top-level resources in Chatty's model.

**Asserting 201:**

```typescript
const res = await axios.post(`${BASE_URL}/post`, postBody, {
  headers: { Cookie: cookie },
  validateStatus: () => true,
});

expect(res.status).toBe(201);
expect(res.data.message).toBe('Post created successfully');
```

### 200 vs 201: Why Does It Matter?

Both indicate success, so why assert the exact code?

1. **The distinction has semantic meaning.** 201 explicitly communicates "a new resource now exists". Testing for 201 verifies the server's semantic intent, not just that it didn't crash.

2. **A 200 from a POST /post would be a bug.** If the server returns 200 instead of 201, it may indicate a code regression where the route handler was accidentally changed.

3. **It validates your test setup.** If you are testing signup and get 200 instead of 201, you probably hit the wrong endpoint or sent the wrong method.

```typescript
// Signup should be 201, not 200
// This test would FAIL if signup incorrectly returned 200
expect(res.status).toBe(201);  // strict — catches regressions
```

---

## 4. The 4xx Family — Client Errors

4xx errors mean the client (your test, or a user) did something wrong. The server understood the request but refuses to fulfill it as written.

### 400 Bad Request

The most general client error. The request is malformed, contains invalid data, or fails validation.

**In Chatty, 400 is returned for:**

| Endpoint | Trigger | Error message |
|----------|---------|---------------|
| `POST /signup` | username < 4 chars | `'Username must be at least 4 characters'` |
| `POST /signup` | password < 12 chars | `'Password must be at least 12 characters long'` |
| `POST /signup` | password missing special char | `'Password must contain...'` |
| `POST /signup` | invalid email format | `'Email must be valid'` |
| `POST /signup` | duplicate username/email | `'User already exists. Username or email is already taken.'` |
| `POST /signin` | username < 4 chars | `'Invalid username'` |
| `POST /signin` | password < 8 chars | `'Invalid password'` |
| `POST /signin` | wrong credentials | `'Invalid credentials'` |
| `PATCH /post/:postId` | invalid ObjectId format | `400` |

**Asserting 400:**

```typescript
const res = await axios.post(
  `${BASE_URL}/signin`,
  { username: 'ab', password: 'Vitest@123456' },  // username too short
  { validateStatus: () => true }
);

expect(res.status).toBe(400);
expect(res.data.message).toBe('Invalid username');
expect(res.data.status).toBe('error');
```

**The Chatty error response shape:**

Every 4xx response in Chatty has the same JSON format:

```json
{
  "message": "Invalid username",
  "statusCode": 400,
  "status": "error"
}
```

Note that `res.data.statusCode` echoes the HTTP status code in the body. You should still assert on `res.status` (the actual HTTP status code), not `res.data.statusCode`.

### 401 Unauthorized

The request requires authentication and none was provided, or the provided credentials are expired/invalid. The name is slightly misleading — "unauthorized" really means "unauthenticated" in HTTP.

**In Chatty, 401 is returned when:**

- A request to an authenticated endpoint is made without the session cookie
- The session cookie is expired or invalid (e.g., after signout)
- The cookie was tampered with

```typescript
// No cookie — returns 401
const res = await axios.get(`${BASE_URL}/currentuser`, {
  validateStatus: () => true,
  // Cookie header intentionally omitted
});

expect(res.status).toBe(401);
```

```typescript
// After signout, the same cookie returns 401
await axios.post(`${BASE_URL}/signout`, {}, { headers: { Cookie: cookie }, validateStatus: () => true });

const res = await axios.get(`${BASE_URL}/currentuser`, {
  headers: { Cookie: cookie },  // cookie is now invalid server-side
  validateStatus: () => true,
});

expect(res.status).toBe(401);
```

### 403 Forbidden

The request is authenticated (the server knows who you are) but you are not allowed to perform the requested action. The difference from 401 is subtle but important.

| Code | Meaning | Fix |
|------|---------|-----|
| 401 | Server does not know who you are | Provide authentication (send the cookie) |
| 403 | Server knows who you are, but you're not allowed | Log in as a different user, or you simply cannot do this |

**In Chatty, 403 is returned when:**

- You try to update or delete another user's post
- You try to access the test cleanup endpoint with the wrong secret header

```typescript
// Try to PATCH a post that belongs to a different user
const res = await axios.patch(
  `${BASE_URL}/post/${otherUsersPostId}`,
  { post: 'Hacked' },
  {
    headers: { Cookie: myUserCookie },  // authenticated as the wrong user
    validateStatus: () => true,
  }
);

expect(res.status).toBe(403);
```

```typescript
// Test cleanup with wrong secret
const res = await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
  headers: { 'x-test-secret': 'wrong-secret' },
  validateStatus: () => true,
});

expect(res.status).toBe(403);
expect(res.data.message).toBe('Forbidden: invalid test secret');
```

### 404 Not Found

The requested resource does not exist. This is returned when a valid, well-formed request targets a resource that cannot be found.

**In Chatty, 404 is returned when:**

- The test cleanup endpoint is called with an authId that does not exist in the database
- A request references a postId or commentId that has been deleted

```typescript
const res = await axios.delete(
  `${BASE_URL}/test/cleanup/user/507f1f77bcf86cd799439999`,
  {
    headers: { 'x-test-secret': 'chatty-test-cleanup-2026' },
    validateStatus: () => true,
  }
);

expect(res.status).toBe(404);
expect(res.data.statusCode).toBe(404);
```

**404 vs empty array:**

Note that some Chatty endpoints return an empty array rather than 404 when no items are found:

```typescript
// Search with no matches returns 200 + empty array, NOT 404
const res = await axios.get(
  `${BASE_URL}/user/profile/search/thisuserdoesnotexist`,
  { headers: { Cookie: cookie }, validateStatus: () => true }
);

expect(res.status).toBe(200);            // Not 404
expect(res.data.search).toEqual([]);     // Empty array
```

This is a common design pattern: 404 is for when a specific resource at a specific URL doesn't exist. An empty search result is not an error — it is a valid result.

### 429 Too Many Requests

The client has sent too many requests in a given time window. The server is rate limiting you.

**In Chatty, 429 is returned by nginx for:**

| Zone | Endpoints | Limit |
|------|-----------|-------|
| `auth` | `/signin`, `/signup` | 5 requests/minute + burst of 5 |
| `api` | All other `/api/` routes | 30 requests/second + burst of 50 |

**What 429 means for test automation:**

429 is the most dangerous status code for automated tests. If your tests run too fast — particularly signup and signin tests — nginx will rate-limit you and your tests will fail with 429 even though the API itself is working correctly.

The `auth` zone allows 5 req/min with a burst of 5. That means you can make up to 10 requests quickly, then you must wait. In practice, if you run 6+ signup tests back-to-back without delays, you will hit 429.

**Strategies for dealing with 429 in tests:**

```typescript
// Strategy 1: Use a shared user (sign in once in beforeAll, reuse the cookie)
// Instead of creating a new user in every test, create one per describe block.
describe('Post tests', () => {
  let cookie: string;

  beforeAll(async () => {
    // Only ONE signin per describe block
    cookie = await signInAndGetCookie('vitestmike', 'Vitest@123456');
  });

  it('test 1', async () => { /* uses shared cookie */ });
  it('test 2', async () => { /* uses shared cookie */ });
});
```

```typescript
// Strategy 2: Accept 429 as a valid response in boundary tests
// When you are deliberately testing the boundary of rate limiting,
// treat 429 as an expected outcome alongside 400.
const res = await axios.post(`${BASE_URL}/signup`, body, { validateStatus: () => true });
expect([400, 429]).toContain(res.status);
```

```typescript
// Strategy 3: Add a delay between rate-limited calls
// Use sparingly — delays slow down the test suite
await new Promise(resolve => setTimeout(resolve, 200));
```

**Asserting 429:**

```typescript
const res = await axios.post(
  `${BASE_URL}/signin`,
  { username: 'vitestmike', password: 'Vitest@123456' },
  { validateStatus: () => true }
);

// If you are deliberately testing rate limiting:
expect(res.status).toBe(429);
```

---

## 5. The 5xx Family — Server Errors

5xx errors mean something went wrong on the server side, not the client side. The request was valid, but the server could not process it.

### 500 Internal Server Error

An unexpected error occurred on the server. This could be an unhandled exception, a database connection failure, or a bug in the server code.

In automated testing, a 500 you did not expect usually means:
- Your test sent a request that hit an unhandled code path
- The server has a bug
- A dependency (database, cache) is unavailable

```typescript
// If you unexpectedly get 500 instead of 400:
expect(res.status).toBe(400);
// Failing test message: "expected 500 to be 400"
// This tells you: the server crashed instead of returning a clean validation error
// That is a server bug — report it
```

You should not expect 500 in normal test assertions. If a test consistently returns 500, something is wrong with the server.

---

## 6. Complete Status Code Reference for Chatty

| Code | Name | When Chatty returns it | What to assert |
|------|------|----------------------|----------------|
| 200 | OK | Successful read, action, update, delete | `message`, response shape |
| 201 | Created | Successful resource creation (signup, create post) | `message`, new resource data |
| 400 | Bad Request | Validation failure, wrong credentials, malformed data | `message`, `status: 'error'` |
| 401 | Unauthorized | Missing or expired session cookie | `status` only (or check `message`) |
| 403 | Forbidden | Authenticated but not allowed (wrong user, wrong secret) | `message` |
| 404 | Not Found | Resource with given ID does not exist | `statusCode`, `message` |
| 429 | Too Many Requests | Rate limit exceeded on auth endpoints | Accept alongside 400 in boundary tests |
| 500 | Internal Server Error | Server bug or dependency failure | Should not appear in passing tests |

---

## 7. How to Assert Status Codes in Vitest

### Exact match

```typescript
expect(res.status).toBe(200);
expect(res.status).toBe(201);
expect(res.status).toBe(400);
```

### Accept multiple valid codes

Use this pattern when a test could legitimately receive two different valid codes (most commonly with rate limiting):

```typescript
// The request is invalid → 400, but if rate-limited → 429
expect([400, 429]).toContain(res.status);
```

### Verify the code is in a family

Less common, but useful for testing that an operation always succeeds without caring about the specific 2xx code:

```typescript
// Assert the status is some kind of success
expect(res.status).toBeGreaterThanOrEqual(200);
expect(res.status).toBeLessThan(300);
```

### Verify a code is not a specific value

```typescript
// Assert that signup did not fail with a server error
expect(res.status).not.toBe(500);
```

---

## 8. Status Code and Error Message Together

The status code and error message are complementary. The code tells machines what category of problem occurred. The message tells humans what went wrong.

In your tests, assert both:

```typescript
const res = await axios.post(
  `${BASE_URL}/signup`,
  { ...validBody, username: 'ab' },  // username too short
  { validateStatus: () => true }
);

// Assert the code AND the message
expect(res.status).toBe(400);
expect(res.data.message).toBe('Username must be at least 4 characters');

// Also assert the error envelope shape
expect(res.data.status).toBe('error');
```

Asserting only the status code is incomplete. Two different bugs could both return 400 but with different messages. The combination of status + message pins down the exact error.

---

## 9. Common Mistakes

| Mistake | Explanation |
|---------|-------------|
| Asserting `res.data.statusCode` instead of `res.status` | `res.data.statusCode` is the Chatty error body — `res.status` is the actual HTTP code |
| Expecting 201 from all POST endpoints | `POST /post/comment` returns 200. `POST /post` returns 201. Check the API reference. |
| Treating 401 and 403 as interchangeable | They have different meanings and require different fixes |
| Not accounting for 429 in auth tests | Rate limiting can make valid tests flaky |
| Accepting any 2xx as success | If your code returns 200 when it should return 201, a loose assertion won't catch it |

---

## Related Topics

- [HTTP Requests](http-requests.md) — how to send requests and read responses with Axios
- [HTTP Headers](http-headers.md) — Cookie and set-cookie for authentication
- [Positive Testing](positive-testing.md) — asserting on 200 and 201 responses
- [Negative Testing](negative-testing.md) — asserting on 400, 401, 403, and 404 responses
- [Boundary Testing](boundary-testing.md) — the `expectRejected([400, 429])` pattern

## Official Documentation

- [MDN — HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [HTTP Status Cats](https://http.cat/)
- [RFC 7231 — Status codes](https://datatracker.ietf.org/doc/html/rfc7231#section-6)
