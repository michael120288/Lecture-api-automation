# HTTP Headers

**Related topics:** [HTTP Requests](http-requests.md) | [HTTP Status Codes](http-status-codes.md) | [REST](rest.md) | [Positive Testing](positive-testing.md)

---

## 1. What Are HTTP Headers?

HTTP headers are key-value pairs that travel alongside every HTTP request and response. They carry metadata — information about the message itself, not the resource being requested.

```
POST /api/v1/signin HTTP/1.1
Host: api.codeandtest.com          ← header
Content-Type: application/json     ← header
Content-Length: 47                 ← header
                                   ← blank line (separates headers from body)
{"username":"vitestmike","password":"Vitest@123456"}
```

Headers answer questions like:
- What format is this data in? (`Content-Type`)
- Who is making this request? (`Cookie`)
- Where should the response be sent? (`Host`)
- Should the browser store this cookie? (`Set-Cookie`)

---

## 2. Request Headers vs Response Headers

### Request Headers

Sent by the client (your test code or a browser) along with the request. They tell the server things about the request.

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Content-Type` | Request | Format of the request body |
| `Content-Length` | Request | Size of the request body in bytes |
| `Host` | Request | Which server to contact (required in HTTP/1.1) |
| `Cookie` | Request | Session credentials sent on authenticated requests |
| `x-test-secret` | Request | Custom header for test cleanup authorization |

### Response Headers

Sent by the server along with the response. They tell the client things about the response.

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Content-Type` | Response | Format of the response body |
| `Content-Length` | Response | Size of the response body |
| `Set-Cookie` | Response | Instructs the client to store a cookie |

The same logical concept (content type) has a different header name depending on direction — `Content-Type` in the request describes what the client is sending; `Content-Type` in the response describes what the server is sending. The name is the same but the context differs.

---

## 3. Header Names Are Case-Insensitive

The HTTP specification states that header names are case-insensitive. `Content-Type`, `content-type`, and `CONTENT-TYPE` are all the same header.

Axios normalizes all response header names to **lowercase** when it stores them. This matters when you read headers in your tests:

```typescript
// Raw HTTP response header:
// Content-Type: application/json
// Set-Cookie: session=eyJ...

// Axios stores them lowercase:
res.headers['content-type']    // 'application/json; charset=utf-8'
res.headers['set-cookie']      // ['session=eyJ...']

// NOT:
res.headers['Content-Type']    // undefined — Axios lowercases keys
res.headers['Set-Cookie']      // undefined
```

When setting **request headers**, Axios accepts any case, but stick to the conventional capitalized form for readability.

---

## 4. Content-Type

`Content-Type` tells the receiver what format the data is in.

### In Requests

When you send a request body (POST, PUT, PATCH), you must tell the server what format it is in.

```
Content-Type: application/json
```

For all Chatty endpoints that accept a body, the expected format is JSON. Axios automatically sets this header when you pass a JavaScript object as the request body.

```typescript
// Axios sets Content-Type: application/json automatically when body is an object
const res = await axios.post(`${BASE_URL}/signin`, {
  username: 'vitestmike',
  password: 'Vitest@123456',
});
// Content-Type: application/json is set for you
```

If you set the body to a string instead of an object, Axios will not set `Content-Type` automatically and the server may reject it or misparse it:

```typescript
// Wrong — sends a string, Axios does not set Content-Type
const res = await axios.post(`${BASE_URL}/signin`, '{"username":"vitestmike"}');

// Correct — sends an object
const res = await axios.post(`${BASE_URL}/signin`, { username: 'vitestmike', password: 'Vitest@123456' });
```

### In Responses

The server's `Content-Type` tells you the format of the response body.

```typescript
// Assert the response is JSON (good as a sanity check)
expect(res.headers['content-type']).toContain('application/json');
```

Chatty returns `application/json; charset=utf-8` for all API responses. You typically do not need to assert this in every test — Axios parses JSON automatically — but it can be useful as a smoke test when verifying a new endpoint.

---

## 5. Cookie Header (Request)

The `Cookie` header is how an authenticated client proves its identity on every request. It carries the session token set by the server after a successful signin.

### The Session Cookie Flow

```
1. Client sends: POST /signin { username, password }

2. Server validates credentials and responds:
   HTTP/1.1 200 OK
   Set-Cookie: session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly
   { "message": "User login successfully", "user": {...}, "token": "..." }

3. Client extracts the session value from Set-Cookie

4. Client sends subsequent requests with:
   Cookie: session=eyJhbGciOiJIUzI1NiJ9...

5. Server reads the Cookie header, validates the session, and processes the request
```

### Extracting the Cookie in Tests

Axios does not automatically handle cookies in Node.js (unlike browsers). You must extract the cookie from the signin response and forward it manually.

```typescript
// Step 1: Sign in
const signinRes = await axios.post(`${BASE_URL}/signin`, {
  username: 'vitestmike',
  password: 'Vitest@123456',
}, { validateStatus: () => true });

// Step 2: Extract the session cookie value
// res.headers['set-cookie'] is an array of strings like:
// ['session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly']
const rawCookie = signinRes.headers['set-cookie']![0];

// Step 3: Keep only the "name=value" part, strip the attributes
// 'session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly'
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this part only
const cookie = rawCookie.split(';')[0];  // 'session=eyJhbGciOiJIUzI1NiJ9...'

// Step 4: Use the cookie on subsequent requests
const currentUserRes = await axios.get(`${BASE_URL}/currentuser`, {
  headers: { Cookie: cookie },
  validateStatus: () => true,
});
```

### Why `.split(';')[0]`?

The full `Set-Cookie` value looks like:

```
session=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6Im1pa2VAdGVzdC5jb20ifQ.sig; Path=/; HttpOnly
```

The Cookie request header only needs the `name=value` part:

```
Cookie: session=eyJhbGciOiJIUzI1NiJ9...
```

The attributes (`Path=/`, `HttpOnly`, `Secure`, `SameSite=Strict`) are instructions to the browser about when to send the cookie automatically. In a programmatic test, you are sending the cookie manually, so those attributes do not apply.

### A Reusable Helper

In the course, cookie extraction is wrapped in a helper to avoid repetition:

```typescript
// src/helpers.ts
export async function signInAndGetCookie(username: string, password: string): Promise<string> {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    { username, password },
    { validateStatus: () => true }
  );

  if (res.status !== 200) {
    throw new Error(`Signin failed: ${res.status} ${JSON.stringify(res.data)}`);
  }

  const rawCookie = res.headers['set-cookie']?.[0];
  if (!rawCookie) {
    throw new Error('No Set-Cookie header in signin response');
  }

  return rawCookie.split(';')[0];  // 'session=eyJ...'
}
```

```typescript
// Usage in tests
beforeAll(async () => {
  cookie = await signInAndGetCookie('vitestmike', 'Vitest@123456');
});
```

---

## 6. Set-Cookie Response Header

`Set-Cookie` is sent by the server to instruct the client to store a cookie. It appears in the response after a successful signin or signup.

### The Full Format

```
Set-Cookie: session=eyJhbGciOiJIUzI1NiJ9...; Path=/; HttpOnly
            |__________________________________| |______| |______|
            name=value                          Path      HttpOnly flag
```

### Cookie Attributes

| Attribute | Meaning | In Chatty |
|-----------|---------|-----------|
| `name=value` | The cookie name and its encoded value | `session=eyJ...` |
| `Path=/` | The cookie is sent for all URL paths on this domain | Yes |
| `HttpOnly` | JavaScript cannot read this cookie (`document.cookie` returns nothing) | Yes |
| `Secure` | Cookie only sent over HTTPS | Used in production |
| `SameSite=Strict` | Cookie not sent on cross-site requests | Used in production |
| `Expires=...` | When the cookie should be deleted | Not set — session cookie |

`HttpOnly` is a security feature. It prevents client-side JavaScript (and browser extensions) from reading the session token. In the context of API testing, it means you cannot read the session value from `document.cookie` — but you are working in Node.js, not a browser, so you read it directly from the `set-cookie` response header.

### Asserting the Set-Cookie Header

```typescript
const res = await axios.post(`${BASE_URL}/signin`, credentials, { validateStatus: () => true });

// Assert the cookie was set
const cookies = res.headers['set-cookie'];
expect(cookies).toBeDefined();
expect(Array.isArray(cookies)).toBe(true);
expect(cookies!.length).toBeGreaterThanOrEqual(1);

// Assert it contains the session
const sessionCookie = cookies![0];
expect(sessionCookie).toContain('session=');
expect(sessionCookie).toContain('Path=/');
expect(sessionCookie).toContain('HttpOnly');
```

```typescript
// Assert the session value is a non-trivial string (not empty, not malformed)
const cookie = cookies![0].split(';')[0];         // 'session=eyJ...'
const sessionValue = cookie.split('=')[1];        // 'eyJ...'
expect(sessionValue.length).toBeGreaterThan(20);  // JWT is always long
```

### Why is Set-Cookie an Array?

`res.headers['set-cookie']` in Axios is always an array of strings, even if there is only one cookie. A server can set multiple cookies in a single response by including multiple `Set-Cookie` headers. Axios collects them into an array.

```typescript
// Always use index [0] to get the first (and in Chatty's case, only) cookie
const sessionCookie = res.headers['set-cookie']![0];
```

---

## 7. Authorization Header (Reference)

The Chatty API uses session cookies for authentication, not the `Authorization` header. However, many other APIs use the `Authorization` header, and it is worth knowing the difference.

### Authorization Header (JWT Bearer Token — other APIs)

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```typescript
// How you would use it with Axios (NOT used in Chatty)
const res = await axios.get(`${OTHER_API}/resource`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Cookie Header (Chatty's approach)

```
Cookie: session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```typescript
// How Chatty uses it
const res = await axios.get(`${BASE_URL}/currentuser`, {
  headers: {
    Cookie: `session=${sessionValue}`,
    // or: Cookie: 'session=eyJ...' (the full cookie string)
  },
});
```

The technical difference: `Authorization` is a standard header designed for credentials. `Cookie` carries all cookies including the session. Both achieve the same goal — proving identity to the server.

Chatty signs users in with `POST /signin`, receives a `Set-Cookie` header, and then sends that cookie back on every authenticated request. This is the standard web session pattern.

---

## 8. x-test-secret (Custom Header)

`x-test-secret` is a non-standard header used exclusively by the Chatty API's test cleanup endpoint. It is a simple shared secret that proves the request is coming from an authorized test runner, not a regular user.

```
DELETE /api/v1/test/cleanup/user/507f1f77bcf86cd799439012 HTTP/1.1
Host: api.codeandtest.com
x-test-secret: chatty-test-cleanup-2026
```

The `x-` prefix was historically used for custom/non-standard headers. The convention is deprecated (RFC 6648) but still widely seen in practice.

### Using it in Tests

```typescript
const res = await axios.delete(
  `${BASE_URL}/test/cleanup/user/${authId}`,
  {
    headers: {
      'x-test-secret': 'chatty-test-cleanup-2026',
    },
    validateStatus: () => true,
  }
);
```

In the course, this value is stored in `src/fixtures.ts`:

```typescript
// src/fixtures.ts
export const TEST_CLEANUP_SECRET = 'chatty-test-cleanup-2026';
```

```typescript
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
  validateStatus: () => true,
});
```

### What happens without the header:

```typescript
// Missing header
const res = await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
  // No x-test-secret header
  validateStatus: () => true,
});

expect(res.status).toBe(403);
expect(res.data.message).toBe('Forbidden: invalid test secret');
```

---

## 9. Reading Headers in Axios: A Reference

```typescript
const res = await axios.post(
  `${BASE_URL}/signin`,
  { username: 'vitestmike', password: 'Vitest@123456' },
  { validateStatus: () => true }
);

// --- Response headers ---

// Content type of the response body
res.headers['content-type']     // 'application/json; charset=utf-8'

// Session cookie (array of strings)
res.headers['set-cookie']       // ['session=eyJ...; Path=/; HttpOnly']

// First cookie string
res.headers['set-cookie']?.[0]  // 'session=eyJ...; Path=/; HttpOnly'

// Just the name=value pair
res.headers['set-cookie']?.[0].split(';')[0]  // 'session=eyJ...'

// --- Sending request headers ---

await axios.get(`${BASE_URL}/currentuser`, {
  headers: {
    Cookie: cookie,              // forward the session cookie
    'Content-Type': 'application/json',  // explicit content type
    'x-test-secret': secret,    // custom header (note: lowercase key)
  },
});
```

---

## 10. Common Mistakes

| Mistake | Explanation | Fix |
|---------|-------------|-----|
| `res.headers['Set-Cookie']` | Axios lowercases all header keys | Use `res.headers['set-cookie']` |
| Sending the full cookie with attributes as the Cookie header | The server only wants `name=value`, not "; Path=/; HttpOnly" | Use `.split(';')[0]` |
| Forgetting to forward the cookie on authenticated requests | The server has no way to identify you | Always include `headers: { Cookie: cookie }` |
| Expecting `set-cookie` to be a string | It is always an array | Access with `[0]` |
| Not setting Content-Type for POST/PUT/PATCH | Server may reject or misparse the body | Always pass an object to Axios, or set the header explicitly |
| Looking for the session value in `res.data` | The session token is in the header, not the body (the body has `token` which is a JWT but not the session cookie) | Read from `res.headers['set-cookie']` |

---

## 11. Full Signin + Authenticated Request Example

```typescript
import axios from 'axios';
import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://api.codeandtest.com/api/v1';

describe('Cookie-based authentication flow', () => {
  it('signs in and uses the cookie for a protected endpoint', async () => {
    // Step 1: Sign in
    const signinRes = await axios.post(
      `${BASE_URL}/signin`,
      { username: 'vitestmike', password: 'Vitest@123456' },
      { validateStatus: () => true }
    );

    expect(signinRes.status).toBe(200);

    // Step 2: Assert the set-cookie header exists and has the right format
    const rawCookies = signinRes.headers['set-cookie'];
    expect(rawCookies).toBeDefined();
    expect(rawCookies![0]).toContain('session=');
    expect(rawCookies![0]).toContain('HttpOnly');

    // Step 3: Extract the cookie
    const cookie = rawCookies![0].split(';')[0];  // 'session=eyJ...'

    // Step 4: Use the cookie on a protected endpoint
    const meRes = await axios.get(
      `${BASE_URL}/currentuser`,
      {
        headers: { Cookie: cookie },
        validateStatus: () => true,
      }
    );

    expect(meRes.status).toBe(200);
    expect(meRes.data.isUser).toBe(true);
    expect(meRes.data.user.username).toBe('Vitestmike');
  });
});
```

---

## Related Topics

- [HTTP Requests](http-requests.md) — how to send requests and structure them correctly
- [HTTP Status Codes](http-status-codes.md) — 200, 201, 400, 401, 403 in context
- [Positive Testing](positive-testing.md) — asserting on successful authenticated responses
- [Negative Testing](negative-testing.md) — testing missing cookie (401) and wrong secret (403)

## Official Documentation

- [MDN — HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [MDN — Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)
- [MDN — Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN — Authorization](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)
