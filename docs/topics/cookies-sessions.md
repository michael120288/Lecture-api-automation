# Cookies and Sessions

## What is a Cookie?

A cookie is a small piece of data that a server sends to the browser (or HTTP client) and asks it to store and send back on every subsequent request to the same domain.

Cookies are the oldest and most widely used mechanism for maintaining state over HTTP, which is itself a stateless protocol. Without cookies (or tokens), every HTTP request would be anonymous — the server would have no way to know that the person making a `GET /currentuser` request is the same person who signed in 5 seconds ago.

---

## The Set-Cookie Header

When Chatty's backend authenticates a user, it responds with a `set-cookie` header:

```
HTTP/1.1 200 OK
set-cookie: session=eyJqd3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0lnT2lKS1YxUWlmUQ==; Path=/; HttpOnly; SameSite=Lax
```

Breaking down the parts:

| Part | Meaning |
|------|---------|
| `session=...` | Name=value — the cookie name is `session`, the value is the encoded payload |
| `Path=/` | Send this cookie with all requests to any path on this domain |
| `HttpOnly` | JavaScript cannot read this cookie (protects against XSS) |
| `SameSite=Lax` | Cookie is sent on top-level navigations but not cross-site sub-requests |

There is no `Expires` or `Max-Age` attribute. That means it is a **session cookie** — it is deleted when the browser is closed (or when the server explicitly clears it on signout).

---

## Session Cookies vs Persistent Cookies

| | Session Cookie | Persistent Cookie |
|-|---------------|------------------|
| When deleted | Browser close / server signout | At the specified `Expires` or `Max-Age` date |
| Use case | Auth sessions | "Remember me", shopping cart |
| Chatty uses | Session cookie | Not used |

Chatty's `session=` cookie has no `Max-Age`. The session lives until the user signs out or the server's session store expires it.

---

## How the Browser Handles Cookies Automatically

When you sign in through a web browser, the browser:

1. Receives the `set-cookie` header
2. Stores the cookie in its cookie jar associated with the domain
3. Automatically includes the cookie in every subsequent request to that domain via the `Cookie:` request header

This is entirely transparent to JavaScript (for HttpOnly cookies). The browser does it automatically.

---

## How Axios Does NOT Handle Cookies Automatically

Axios in Node.js does **not** behave like a browser. It does not maintain a cookie jar by default. When you receive a `set-cookie` header, you must:

1. Capture it manually from `response.headers['set-cookie']`
2. Send it back manually in subsequent requests via `headers: { Cookie: ... }`

If you forget to do this, every authenticated request will return 401 — because the server sees no session cookie.

This is one of the most common bugs beginners write in this course.

---

## Capturing the Cookie from a Signin Response

```typescript
import axios, { type AxiosResponse } from 'axios';
import { config } from '../../src/config';

const signinUrl = `${config.BASE_URL}/signin`;

let sessionCookie: string = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, {
    validateStatus: () => true,
  });

  // set-cookie is always an array — one element per Set-Cookie header the
  // server sent. Chatty sends exactly one, so we take index [0].
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});
```

Why `Array.isArray(raw) ? raw[0] : (raw ?? '')`:

- The HTTP spec allows a server to send multiple `Set-Cookie` headers
- Axios parses them into a string array: `string[] | string | undefined`
- If Chatty sends one cookie (normal case): `raw` is `['session=...']` → we want `raw[0]`
- If there is only one and the HTTP client returns it as a plain string: `raw` is `'session=...'`
- If the header is absent: `raw` is `undefined` → we default to `''`

---

## Sending the Cookie in Subsequent Requests

```typescript
// Authenticated request — passes the captured cookie back
const res = await axios.get(`${config.BASE_URL}/currentuser`, {
  headers: {
    Cookie: sessionCookie,
  },
  validateStatus: () => true,
});

expect(res.status).toBe(200);
```

Without the `Cookie` header:

```typescript
// No cookie — server cannot identify the session
const res = await axios.get(`${config.BASE_URL}/currentuser`, {
  validateStatus: () => true,
});

expect(res.status).toBe(401);
```

---

## The Chatty Session Cookie Internals

Chatty uses the `cookie-session` npm package. When a user signs in, the server does:

```typescript
// Inside the Chatty backend (simplified)
req.session = { jwt: userJwt };
```

The `cookie-session` middleware serializes this object to JSON, Base64-encodes it, and sets it as the `session=` cookie value. The JWT itself is stored inside the cookie.

This means:

- The cookie value contains the JWT
- The server reads `req.session.jwt` on every authenticated request
- The JWT is then verified with `jsonwebtoken.verify()`

Chatty does not store session state in a database or Redis — the session IS the cookie. This is different from `express-session`, which stores session data on the server and uses the cookie only as a lookup key.

---

## Asserting Cookie Properties in Tests

From Lecture 2:

```typescript
describe('Session cookie', () => {

  it('set-cookie header is present', () => {
    expect(signInResponse.headers['set-cookie']).toBeDefined();
  });

  it('set-cookie header is an array', () => {
    expect(Array.isArray(signInResponse.headers['set-cookie'])).toBe(true);
  });

  it('cookie contains "session="', () => {
    expect(sessionCookie).toContain('session=');
  });

  it('cookie contains HttpOnly directive', () => {
    // .toLowerCase() because HTTP headers are case-insensitive
    expect(sessionCookie.toLowerCase()).toContain('httponly');
  });

});
```

---

## What Happens When the Session Expires

Chatty's session cookies are not set with an `Expires` attribute, so they do not expire on a schedule. However, there are two ways the session becomes invalid:

1. **User signs out**: `POST /api/v1/signout` sets `req.session = null`. The server clears the session data. The cookie still exists on the client but is now empty — subsequent requests return 401.

2. **Server restarts with a different secret**: `cookie-session` signs cookies with the app's `SESSION_SECRET`. If the secret changes, all existing cookies become invalid.

After signout, any request with the old cookie returns 401:

```typescript
describe('Signout invalidates session', () => {

  it('after signout, GET /currentuser returns 401', async () => {
    // Sign in → get cookie
    const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
    const cookie = loginRes.headers['set-cookie']?.[0] ?? '';

    // Sign out
    await axios.post(signoutUrl, {}, {
      headers: { Cookie: cookie },
      validateStatus: () => true,
    });

    // Try using the old cookie — should fail
    const afterSignout = await axios.get(currentUserUrl, {
      headers: { Cookie: cookie },
      validateStatus: () => true,
    });
    expect(afterSignout.status).toBe(401);
  });

});
```

---

## Full Example: The Cookie Lifecycle in One Test File

```typescript
import axios, { type AxiosResponse } from 'axios';
import { config } from '../../src/config';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const signoutUrl     = `${config.BASE_URL}/signout`;

let sessionCookie = '';

// 1. Sign in and capture the cookie
beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });

  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

// 2. Clean up after all tests
afterAll(async () => {
  if (!sessionCookie) return;

  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// 3. Use the cookie in tests
describe('Authenticated requests', () => {

  it('GET /currentuser with cookie returns 200', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('GET /currentuser without cookie returns 401', async () => {
    const res = await axios.get(currentUserUrl, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(401);
  });

});
```

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Not capturing the cookie from `set-cookie` | `sessionCookie` is empty string | Check `loginRes.headers['set-cookie']` |
| Using `headers: { cookie: ... }` (lowercase) | Node.js normalises header names to lowercase; this actually works — but be consistent and use `Cookie` | Use `Cookie` (capitalised) for clarity |
| Re-using `sessionCookie` after signout | 401 on all subsequent requests | Sign in again after any signout |
| Storing the raw array `raw` instead of `raw[0]` | Cookie header contains `['session=...']` as a string | Always index: `raw[0]` |
| Testing cookie in browser-like tests without a browser | Browser auto-sends cookies; Axios does not | Always pass `headers: { Cookie: sessionCookie }` manually |
| Forgetting `afterAll` signout | Orphaned sessions accumulate; may cause issues in repeated test runs | Always signout in `afterAll` |

---

## Related Topics

- [JWT — JSON Web Tokens](jwt.md)
- [SSO — Single Sign-On](sso.md)
- [Rate Limiting](rate-limiting.md)

## Official Documentation

- [MDN — HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [MDN — Set-Cookie header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
