# SSO — Single Sign-On

## What is Single Sign-On?

Single Sign-On (SSO) is an authentication pattern that allows a user to authenticate once and then access multiple applications without signing in again.

The classic example: you sign in to Google once, and then Gmail, Google Drive, Google Calendar, and YouTube all know who you are — without you re-entering your password for each one.

The key mechanism: a **token** is passed from one service (the identity provider) to another (the resource application). The receiving application trusts the token without needing to verify the password itself.

---

## Why SSO Is Useful

| Scenario | Without SSO | With SSO |
|----------|-------------|---------|
| User signs in to App A, then navigates to App B | Must sign in again | Already authenticated |
| Mobile app → web app handoff | Each app manages separate sessions | Token passed between apps establishes session |
| Microservices internal auth | Each service needs its own session management | Token carries identity across services |
| Testing: get a session from a known-good JWT | Must call the full signin flow | Pass the JWT directly to `/sso` |

In the context of Chatty, SSO is useful for service-to-service authentication. Imagine the `test-quest` backend needing to authenticate a Chatty user — it would call the Chatty `/sso` endpoint with the user's JWT to create a Chatty session, rather than asking the user to type their password again.

---

## How Chatty Implements SSO

Chatty exposes a single SSO endpoint:

```
POST /api/v1/sso
```

**Request body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjFhYjEyMzQ1NmMi..."
}
```

**Success response (200):**

```json
{
  "message": "SSO login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjFhYjEyMzQ1NmMi...",
  "user": {
    "_id": "661ab12345...",
    "username": "Vitestmike",
    "email": "mike@example.com",
    "avatarColor": "#4a90e2",
    "postsCount": 0
  }
}
```

Additionally, the response includes a `set-cookie` header containing the new session cookie — exactly like a regular signin.

---

## SSO vs Regular Signin: The Difference

| Aspect | Regular Signin (`POST /signin`) | SSO (`POST /sso`) |
|--------|--------------------------------|-------------------|
| Input | `{ username, password }` | `{ token: jwtString }` |
| Authentication mechanism | Password verification (bcrypt.compare) | JWT signature verification |
| Returns session cookie | Yes | Yes |
| Returns JWT | Yes (new token generated) | Yes (same token passed in) |
| Use case | User knows their password | Service holds a valid JWT |

**Critical difference**: Regular signin generates a new JWT. SSO takes an existing JWT, verifies its signature, and creates a new session using the identity from that token. The returned `token` in the SSO response is the same JWT that was passed in — it is not re-generated.

---

## Testing SSO: The Full Flow

From Lecture 14:

```typescript
import axios from 'axios';
import { config } from '../../src/config';

const signinUrl  = `${config.BASE_URL}/signin`;
const ssoUrl     = `${config.BASE_URL}/sso`;
const signoutUrl = `${config.BASE_URL}/signout`;

const credentials = {
  username: config.TEST_USERNAME,
  password: config.TEST_PASSWORD,
};

let jwt = '';
let sessionCookie = '';

beforeAll(async () => {
  // Step 1: Sign in to get a JWT
  const loginRes = await axios.post(signinUrl, credentials, {
    validateStatus: () => true,
  });
  jwt = loginRes.data.token ?? '';
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

afterAll(async () => {
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

describe('SSO — Single Sign-On', () => {

  it('valid JWT returns 200 and a user object', async () => {
    const res = await axios.post(ssoUrl, { token: jwt }, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('SSO login successful');
    expect(res.data.user).toBeDefined();
  });

  it('SSO returns the same token that was passed in', async () => {
    const res = await axios.post(ssoUrl, { token: jwt }, {
      validateStatus: () => true,
    });
    // SSO does not generate a new JWT — it validates and returns the existing one
    expect(res.data.token).toBe(jwt);
  });

  it('SSO sets a session cookie', async () => {
    const res = await axios.post(ssoUrl, { token: jwt }, {
      validateStatus: () => true,
    });
    // A new session is established — same cookie mechanism as regular signin
    expect(res.headers['set-cookie']).toBeDefined();
  });

});
```

---

## SSO Error Cases

The SSO endpoint validates the token before accepting it. The error messages are:

### Missing token

```typescript
it('empty body returns 400 "Token required"', async () => {
  const res = await axios.post(ssoUrl, {}, { validateStatus: () => true });
  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Token required');
});
```

### Invalid token format or invalid signature

```typescript
it('invalid JWT string returns 400', async () => {
  const res = await axios.post(ssoUrl, {
    token: 'not.a.valid.jwt',
  }, { validateStatus: () => true });
  expect(res.status).toBe(400);
});
```

### Expired token

A valid JWT that has passed its `exp` claim will also be rejected:

```json
HTTP/1.1 400 Bad Request

{
  "message": "Invalid token",
  "status": "error",
  "statusCode": 400
}
```

---

## Error Message Summary

| Condition | Status | Message |
|-----------|--------|---------|
| No `token` field in body | 400 | `"Token required"` |
| Token is not a valid JWT format | 400 | `"Invalid token"` |
| Token signature is invalid | 400 | `"Invalid token"` |
| Token is expired | 400 | `"Invalid token"` |
| Valid token | 200 | `"SSO login successful"` |

---

## The Session Cookie from SSO

After a successful SSO call, the session cookie works identically to one obtained from regular signin:

```typescript
it('SSO session cookie authenticates subsequent requests', async () => {
  // Step 1: get a JWT from signin
  const loginRes = await axios.post(signinUrl, credentials, {
    validateStatus: () => true,
  });
  const jwt = loginRes.data.token;

  // Step 2: use JWT to create a session via SSO
  const ssoRes = await axios.post(ssoUrl, { token: jwt }, {
    validateStatus: () => true,
  });
  const raw = ssoRes.headers['set-cookie'];
  const ssoCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  // Step 3: use the SSO cookie to make authenticated requests
  const currentUserRes = await axios.get(`${config.BASE_URL}/currentuser`, {
    headers: { Cookie: ssoCookie },
    validateStatus: () => true,
  });

  expect(currentUserRes.status).toBe(200);
  expect(currentUserRes.data.isUser).toBe(true);
});
```

---

## SSO in a Multi-Service Architecture

The practical purpose of SSO becomes clear in a multi-service architecture:

```
User → signs in to Service A → receives JWT
        └→ Service A calls Service B's /sso with the JWT
                └→ Service B creates a session
                └→ User is authenticated in Service B without a second login
```

In the chatty-api-tests project context: if `test-quest` obtained a user JWT through its own authentication, it could pass that JWT to Chatty's SSO endpoint to establish a Chatty session for that user. This is the "login once, access multiple apps" pattern.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Passing the session cookie value (not the JWT) to `/sso` | 400 "Invalid token" | The SSO body takes `{ token: jwt }` — the raw JWT string, not the cookie |
| Expecting SSO to return a new JWT | Test fails — `res.data.token !== jwt` | SSO returns the same token that was passed in |
| Forgetting to extract the session cookie from the SSO response | 401 on subsequent requests | Extract `set-cookie` from the SSO response exactly as you would from signin |
| Using an expired JWT for SSO | 400 "Invalid token" | Get a fresh JWT from signin before calling SSO |
| Sending `{ token: 'Bearer ' + jwt }` | 400 — the `Bearer ` prefix is for `Authorization` headers, not for the SSO body | Send the raw token: `{ token: jwt }` |

---

## Related Topics

- [JWT — JSON Web Tokens](jwt.md)
- [Cookies and Sessions](cookies-sessions.md)
- [Rate Limiting](rate-limiting.md)

## Official Documentation

- [OAuth 2.0 — Official docs](https://oauth.net/2/)
- [OpenID Connect](https://openid.net/connect/)
- [Auth0 — What is SSO?](https://auth0.com/docs/authenticate/single-sign-on)
