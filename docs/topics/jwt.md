# JWT — JSON Web Tokens

## What is a JWT?

A JSON Web Token (JWT, pronounced "jot") is a compact, self-contained string that proves a claim about the user who holds it. When the Chatty backend creates a JWT at signin, it signs the token with a secret key only the server knows. Any client that presents the token can be trusted to be who the token says they are — as long as the signature is valid.

The critical thing to understand early: **a JWT is encoded, not encrypted**. The data inside it is readable by anyone. The security comes from the signature, not from hiding the data.

---

## The Three-Part Structure

A JWT is always three Base64URL-encoded strings joined by dots:

```
header.payload.signature
```

Real example from the Chatty API (shortened for readability):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJ1c2VySWQiOiI2NjFhYjEyMzQ1NmMiLCJpYXQiOjE3MTMzNjAwMDAsImV4cCI6MTcxMzk2NDgwMH0
.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

| Part | Content | Example decoded |
|------|---------|----------------|
| Header | Algorithm and token type | `{"alg":"HS256","typ":"JWT"}` |
| Payload | Claims (userId, issued-at, expiry) | `{"userId":"661ab1...","iat":1713360000,"exp":1713964800}` |
| Signature | HMAC of header + payload using the server's secret | (binary, not human-readable) |

---

## Why the Header Always Starts with `eyJ`

Every JWT header begins with `eyJ`. This is not a coincidence — it is a consequence of Base64URL encoding.

The header is always a JSON object, and JSON objects always begin with `{`. The double-quote character that follows is part of the first key (`"alg"`). Base64URL encoding of the string `{"` always produces `eyJ`:

```
ASCII:       {    "
Hex:         7B   22
Base64URL:   e    y    J
```

You can use this to do a fast sanity check in tests:

```typescript
// Quick format check — not a full validation
const token: string = res.data.token;
expect(token.startsWith('eyJ')).toBe(true);
```

This check tells you: the server returned something shaped like a JWT header. It does not tell you the token is valid — that requires verifying the signature, which needs the server's secret.

---

## The Payload: What Chatty Stores

The payload is a set of **claims** — key-value pairs that describe the token holder. Chatty's tokens contain:

| Claim | Meaning |
|-------|---------|
| `userId` | The MongoDB ObjectId of the Auth document |
| `iat` | Issued At — Unix timestamp when the token was created |
| `exp` | Expiry — Unix timestamp after which the token is invalid |

You can decode the payload in JavaScript (in Node.js) like this:

```typescript
// Decode without verifying — for inspection only, never for auth decisions
const token = res.data.token;
const parts = token.split('.');
const payloadBase64 = parts[1];

// Base64URL → Base64: replace - with + and _ with /
const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
const json = Buffer.from(base64, 'base64').toString('utf8');
const payload = JSON.parse(json);

console.log(payload);
// { userId: '661ab12345...', iat: 1713360000, exp: 1713964800 }
```

In your tests you rarely need to do this — the point is that you can, because the payload is not encrypted.

---

## Base64URL vs Regular Base64

Regular Base64 uses `+`, `/`, and `=` (padding). URLs cannot safely contain these characters. Base64URL replaces:

- `+` with `-`
- `/` with `_`
- removes `=` padding

This is why JWTs look slightly different from Base64 you might see in image data URLs or email attachments.

---

## JWT vs Session Cookies: Stateless vs Stateful

This is a fundamental architectural difference.

| | JWT | Session Cookie |
|-|-----|---------------|
| State stored where | Inside the token (stateless) | On the server (stateful) |
| Server needs to remember? | No | Yes |
| Can be invalidated instantly? | No (until expiry) | Yes (delete server session) |
| Size | Larger (contains claims) | Small (just a session ID) |
| How validated | Signature check only | Database or cache lookup |

Chatty combines both: the session cookie is an HTTP-only cookie containing the JWT. The server reads the JWT from the session cookie, verifies the signature, and extracts the userId. This gives you the XSS protection of HttpOnly cookies plus the stateless validation of JWT.

The JWT is the fact; the cookie is the transport mechanism.

---

## The Chatty Signin Response

A successful `POST /api/v1/signin` returns:

```json
{
  "message": "User login successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjFhYjEyMzQ1NmMiLCJpYXQiOjE3MTMzNjAwMDAsImV4cCI6MTcxMzk2NDgwMH0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "user": {
    "_id": "661ab12345...",
    "username": "Vitestmike",
    "email": "mike@example.com",
    "avatarColor": "#4a90e2",
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0
  }
}
```

The `token` field is the raw JWT string. The session cookie is delivered separately via the `set-cookie` response header.

---

## Validating JWT Format in Tests

In the course you never verify the JWT signature in tests — that would require the server's secret key and would be testing the JWT library, not your API. Instead you validate the **format**:

```typescript
describe('JWT token format', () => {

  it('token exists in response', () => {
    expect(signInResponse.data.token).toBeDefined();
  });

  it('token is a non-empty string', () => {
    expect(typeof signInResponse.data.token).toBe('string');
    expect(signInResponse.data.token.length).toBeGreaterThan(0);
  });

  it('token has three dot-separated parts', () => {
    const parts = signInResponse.data.token.split('.');
    expect(parts).toHaveLength(3);
    parts.forEach(part => {
      expect(part.length).toBeGreaterThan(0);
    });
  });

  it('header part starts with eyJ', () => {
    expect(signInResponse.data.token.startsWith('eyJ')).toBe(true);
  });

  it('token contains no spaces', () => {
    expect(signInResponse.data.token).not.toContain(' ');
  });

});
```

These checks catch common server-side bugs:
- Returning `undefined` instead of the token
- Returning just the userId string instead of the signed token
- Returning a truncated or double-encoded token

---

## Using JWT in the Axios Authorization Header

Some APIs expect the JWT in an `Authorization` header using the Bearer scheme:

```typescript
const res = await axios.get(`${config.BASE_URL}/some-protected-endpoint`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
  validateStatus: () => true,
});
```

Chatty uses session cookies for authentication in most of its endpoints, so you will mostly see the cookie approach in this course. The SSO endpoint (`POST /api/v1/sso`) accepts a JWT in the request body to bootstrap a new session. See [SSO](sso.md) for details.

---

## JWT Expiry and 401 Unauthorized

Every Chatty JWT has an `exp` claim. When the current time exceeds `exp`, the token is expired. Any authenticated request made with an expired token returns:

```json
HTTP 401 Unauthorized

{
  "message": "User is unauthenticated",
  "status": "error",
  "statusCode": 401
}
```

In tests you will not encounter this unless you deliberately create an expired token or leave a test running for days. However, understanding this is essential for diagnosing flaky tests in CI pipelines where a token might be created in one job and used hours later.

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Asserting `token === 'eyJ...'` (exact value) | Test breaks every signin | Assert format only — `parts.length === 3` |
| Storing the token in a global without re-signing | Expired token → 401 | Use `beforeAll` to re-sign at the start of each test file |
| Treating the payload as trusted on the client | Security risk | Always validate on the server — the payload is readable, not authenticated |
| Using `Authorization: Bearer` on Chatty endpoints that expect cookies | 401 | Use `Cookie` header with the session cookie |
| Logging the full token to console in CI | Token leakage | Avoid logging tokens; log only the first 10 chars for debugging |

---

## Related Topics

- [Cookies and Sessions](cookies-sessions.md)
- [SSO — Single Sign-On](sso.md)
- [Base64 Encoding](base64.md)
- [JSON](json.md)

## Official Documentation

- [JWT.io — Introduction](https://jwt.io/introduction)
- [JWT.io — Debugger (decode any token)](https://jwt.io/)
- [RFC 7519 — JSON Web Token standard](https://datatracker.ietf.org/doc/html/rfc7519)
- [Auth0 — JWT handbook (free)](https://auth0.com/resources/ebooks/jwt-handbook)
