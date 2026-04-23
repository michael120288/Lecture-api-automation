---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 1.6rem; }
  code { font-size: 0.9rem; }
  h2 { color: #1a1a2e; }
  blockquote { color: #c0392b; border-left: 4px solid #c0392b; }
---

# Lecture 14
## Password Reset & SSO

Testing flows you can only partially automate

---

## The Password Reset Flow

| Step | Request | Result |
|------|---------|--------|
| 1 | `POST /forgot-password` | email sent |
| 2 | *(open email, click link)* | **cannot automate** |
| 3 | `POST /reset-password/:token` | password changed |

> We test steps 1 and 3 (error cases only) — step 2 requires a real inbox

<!-- note: this diagram shows the full 3-step flow. Step 2 is the wall. We can test step 1 and a broken version of step 3. We cannot test step 3 with a real token. -->

---

## What We Can and Cannot Test

> You CANNOT test the email inbox in automated tests

- Step 1: test it returns 200
- Step 2: skip — no inbox access
- Step 3: test with an **invalid** token only

<!-- note: emphasize this. Students try to test the happy path of step 3 by using their actual reset token. That changes a real account's password every time the test runs. -->

---

## Test the Error Cases Instead

```ts
const res = await axios.post(
  `${BASE_URL}/reset-password/invalidtoken123`,
  { password: 'NewPass@123456',
    confirmPassword: 'NewPass@123456' },
  { validateStatus: () => true }
);
expect(res.status).toBe(400);
expect(res.data.message).toBe('Reset token has expired.');
```

<!-- note: invalid tokens return 400 "Reset token has expired." — safe to test, no real data touched. This is the correct way to verify the reset endpoint exists and validates. -->

---

## Forgot Password — Happy Path

```ts
const res = await axios.post(
  `${BASE_URL}/forgot-password`,
  { email: config.TEST_USERNAME + '@test.com' },
  { validateStatus: () => true }
);
expect(res.status).toBe(200);
```

> 200 means the request was accepted — not that the email was delivered

<!-- note: this is a common mistake. Students think 200 confirms delivery. It only confirms the server accepted the request. Email delivery is async and outside our reach. -->

---

## Validation Rules Quick Reference

| Endpoint | Error | Status |
|----------|-------|--------|
| `/forgot-password` | Invalid email format | 400 |
| `/forgot-password` | Email not in DB | 400 |
| `/reset-password/:token` | Passwords don't match | 400 |
| `/reset-password/:token` | Any invalid token | 400 |

<!-- note: these validation cases are all safe to test because they never touch a real user account. The token is fake, so no state changes. -->

---

## SSO — Single Sign-On Flow

`POST /signin` → JWT token

↓ pass token to SSO

`POST /sso { token }` → new session cookie + same token returned

<!-- note: SSO lets an app that already holds a valid JWT create a session without re-entering credentials. We sign in first, then use that token for SSO. -->

---

## SSO Code Pattern

```ts
const loginRes = await axios.post(
  `${BASE_URL}/signin`, credentials,
  { validateStatus: () => true }
);
const jwt = loginRes.data.token;

const ssoRes = await axios.post(
  `${BASE_URL}/sso`, { token: jwt },
  { validateStatus: () => true }
);
expect(ssoRes.status).toBe(200);
```

<!-- note: the JWT from /signin is used directly in /sso. No transformation. Same token, different endpoint. -->

---

## SSO Error Cases

| Scenario | Status |
|----------|--------|
| Empty body | 400 |
| Malformed JWT | 400 |
| Valid token, valid user | 200 |

> Always test the failure paths too

<!-- note: testing error paths verifies the API contract. If the API stops returning 400 for an empty body, that's a regression. -->

---

## Three New Assertion Matchers

```ts
// Strictly null — not undefined, not false
expect(res.data.someField).toBeNull();

// JWT format: header.payload.signature
expect(res.data.token).toMatch(
  /^[\w-]+\.[\w-]+\.[\w-]+$/
);

// Type check — cleaner than typeof
expect(res.data.token).toBeTypeOf('string');
```

<!-- note: toMatch with regex is powerful for fields where the exact value changes but the format is fixed. JWT format is a perfect example. -->

---

## Key Rule

> Test the error cases — not the success path you can't reach

- Invalid token: safe to test, no data changes
- Email delivery: untestable without a mail server
- Use Mailhog/Mailtrap in staging for full flow

---

## Homework

| TODO | Goal |
|------|------|
| 1 | POST /forgot-password with valid email → 200 |
| 2 | POST /forgot-password with invalid format → 400 |
| 3 | POST /reset-password/badtoken mismatched passwords → 400 |
| 4 | SSO: sign in, get token, POST /sso → 200 |
| 5 | SSO with empty body → 400 |
| 6 | `toBeNull` — assert absent token field |
| 7 | `toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)` — validate JWT format |

Goal: **7 tests passing**
