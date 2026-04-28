# Lecture 14 — Password Reset & SSO

> ⏱ **Estimated time: 75–90 min**
> **Previous lecture:** Lecture 13 — test reporting, Newman, coverage.
> 📚 **Before starting:** Open `prereqs.md` in this folder first (~10–25 min)
>
> **Quick Start:**
> ```bash
> npm test tests/lecture-14/lecture.test.ts
> npm test tests/lecture-14/homework/starter.test.ts
> ```

---

## What You Will Learn

- `POST /forgot-password` — trigger password reset email flow
- `POST /reset-password/:token` — use a token to set a new password
- Why you **cannot automate the full reset flow** — and what you test instead
- **Testing multi-step flows** where step 2 depends on data from step 1
- Token expiry — reset tokens expire after 1 hour
- `POST /sso` — Single Sign-On via existing JWT
- How SSO works: pass a valid JWT to get a new session cookie
- Advanced assertion variants — `toBeNull` for explicit null checks, `toMatch(/regex/)` for JWT format validation, `toBeTypeOf` for token type checking

> **Reference Topics**
> - JWT structure and validation → [`docs/topics/jwt.md`](../../docs/topics/jwt.md)
> - How SSO works in Chatty → [`docs/topics/sso.md`](../../docs/topics/sso.md)

---

## Contents

| # | Section |
|---|---------|
| 1 | Endpoints in This Lecture |
| 2 | The Password Reset Flow |
| 3 | Why We Cannot Automate Step 2 |
| 4 | What We Test Instead |
| 5 | SSO — Single Sign-On |
| 6 | Postman |
| 7 | Endpoint Schema & Validation Rules |
| 8 | Running the Tests |
| 9 | Git |

---

## 1. Endpoints

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| POST | `/forgot-password` | ❌ | `{ message: "Password reset email sent." }` |
| POST | `/reset-password/:token` | ❌ | `{ message: "Password successfully updated." }` |
| POST | `/sso` | ❌ | `{ message: "SSO login successful", user: {...}, token }` |

---

## 2. The Password Reset Flow

The reset flow has **three steps**:

```
Step 1: POST /forgot-password { email }
        → Server generates a random 40-char hex token
        → Stores it in the Auth document with a 1-hour expiry
        → Sends a reset email with the link: /reset-password?token=<token>
        → Returns 200

Step 2: User clicks the link in the email
        → Browser navigates to the reset page
        → User enters new password

Step 3: POST /reset-password/:token { password, confirmPassword }
        → Server finds the Auth document by token (only if not expired)
        → Updates the password (hashed)
        → Clears the token
        → Sends a confirmation email
        → Returns 200
```

---

## 3. Why We Cannot Automate the Full Flow

Step 2 requires **reading an email inbox**. In automated tests we have no access to the email inbox.

This is a common limitation in API testing. The approach:

**What we CAN test:**
- Step 1 returns 200 with the correct message
- Step 1 returns 400 for non-existent email
- Step 3 with an invalid/expired token returns 400

**What we CANNOT test automatically:**
- The actual password reset link (we'd need to intercept the email)
- Step 3 with a valid token (would change the account's password permanently)

> **Real-world solution:** In a staging environment, use a test email service like
> [Mailhog](https://github.com/mailhog/MailHog) or [Mailtrap](https://mailtrap.io)
> that captures emails in a test inbox accessible via API.

---

## 4. What We Test Instead

**Step 1 — happy path:**
```ts
const res = await axios.post(`${config.BASE_URL}/forgot-password`, {
  email: config.TEST_USERNAME + '@test.com', // use a known email
}, { validateStatus: () => true });
expect(res.status).toBe(200);
```

> ⚠️ Returns 400 `'Invalid credentials'` if the email doesn't exist in the database.
> ⚠️ Always returns 200 even on success — no way to tell if email was actually delivered.

**Step 3 — invalid token:**
```ts
const res = await axios.post(`${config.BASE_URL}/reset-password/invalidtoken123`, {
  password: 'NewPass@123456',
  confirmPassword: 'NewPass@123456',
}, { validateStatus: () => true });
expect(res.status).toBe(400);
expect(res.data.message).toBe('Reset token has expired.');
```

---

## 5. SSO — Single Sign-On

SSO allows a system that already has a valid Chatty JWT to create a session without username/password.

**How it works:**
1. You already have a valid JWT (from `/signin` or `/signup`)
2. POST that JWT to `/sso`
3. The server verifies it, finds the user, and creates a new session

**Use case:** A mobile app or external service that generates its own JWTs using the same secret.

**In tests:** Get a JWT from `/signin`, then pass it to `/sso`:

```ts
// Sign in first to get a JWT
const loginRes = await axios.post(`${config.BASE_URL}/signin`, credentials, { validateStatus: () => true });
const jwt = loginRes.data.token;

// Use that JWT for SSO
const ssoRes = await axios.post(`${config.BASE_URL}/sso`, { token: jwt }, { validateStatus: () => true });
expect(ssoRes.status).toBe(200);
```

> ⚠️ SSO accepts the **exact same JWT** that signin returns.
> ⚠️ Returns 400 `'Token required'` if body is empty.
> ⚠️ Returns 400 `'User not found'` if the token is valid JWT but the user was deleted.

---

## 6. Postman

Create folder **Lecture 14**.

### Forgot password
- POST `{{base_url}}/forgot-password`
- Body: `{ "email": "your-test-email@example.com" }`
- Assert: status 200, message "Password reset email sent."

### Reset password with invalid token
- POST `{{base_url}}/reset-password/thisisnotavalidtoken`
- Body: `{ "password": "NewPass@123456", "confirmPassword": "NewPass@123456" }`
- Assert: status 400, message "Reset token has expired."

### SSO flow
1. Run **L02 — SignIn success** to get a JWT (saved in `{{token}}`)
2. POST `{{base_url}}/sso` with body: `{ "token": "{{token}}" }`
3. Assert: status 200, `user` object present, same token returned

---

## 7. Endpoint Schema & Validation Rules

> **Live API reference:** If validation rules change, check the current spec:
> - Machine-readable: `GET https://api.codeandtest.com/api/v1/schema`
> - Interactive (Swagger UI): `https://api.codeandtest.com/api-docs`


### `POST /forgot-password`
**Schema:** `emailSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | ✅ | valid email format |

**Errors (400):**
- Invalid email format: `'Field must be valid'`
- Email not in database: `'Invalid credentials'`

---

### `POST /reset-password/:token`
**Schema:** `passwordSchema`

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `password` | string | ✅ | min 12, max 128, pattern: upper + lower + digit + special |
| `confirmPassword` | string | ✅ | must equal `password` |

**Errors (400):**
- Password mismatch: `'Passwords do not match'`
- Invalid/expired token: `'Reset token has expired.'`

---

### `POST /sso`
No Joi schema — validates manually in controller.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | ✅ | Valid JWT signed with `JWT_TOKEN` |

**Errors (400):**
- Missing token: `'Token required'`
- User not found: `'User not found'`
- Invalid/expired JWT: throws JWT error

---

## Key Takeaways

- ✅ Password reset is a multi-step flow — Step 2 (email link) cannot be automated without a test email service
- ✅ Always test validation errors for flows you can't fully automate
- ✅ Invalid reset tokens return `'Reset token has expired.'` — safe to test without real tokens
- ✅ SSO takes an existing JWT and creates a new session — useful for integrations

**What's next:** Lecture 15 — posts with images and videos. Testing media upload endpoints.

---

## 8. Running the Tests

```bash
npm test tests/lecture-14/lecture.test.ts
```

## 9. Git

```bash
# Stage the files for this lecture
git add tests/lecture-14/
git status                          # verify what will be committed

# Commit
git commit -m "lecture-14: password reset flow, SSO"

# Push the branch to GitHub
git push -u origin lecture-14-password-reset
```

### Open a Pull Request

1. Go to `github.com/YOUR_USERNAME/chatty-api-tests`
2. Click **Compare & pull request** (GitHub shows this banner after a push)
3. Title: `lecture-14: password reset flow, SSO`
4. Click **Create pull request**
5. If Lecture 11 (CI/CD) is set up, the pipeline runs automatically here
6. Merge when the PR looks good

### After merging — start the next lecture

```bash
git checkout master
git pull origin master               # get the merged changes
git checkout -b lecture-15-posts-media
```


## Homework

**7 Vitest TODOs**

| TODO | What it practices |
|------|------------------|
| 1 | POST /forgot-password with valid email → 200 |
| 2 | POST /forgot-password with invalid email format → 400 |
| 3 | POST /reset-password/badtoken with mismatched passwords → 400 |
| 4 | SSO: sign in, get token, POST /sso, assert 200 |
| 5 | `.then()` — SSO with empty body → 400 |
| 6 | `toBeNull` — assert absent token field coerced to null is strictly null |
| 7 | `toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)` — validate JWT format with regex |

Goal: **7 tests passing.**

```bash
npm test tests/lecture-14/homework/starter.test.ts
```
