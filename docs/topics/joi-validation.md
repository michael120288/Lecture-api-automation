# Joi Validation

## Table of Contents

1. [What Joi Is](#1-what-joi-is)
2. [Why APIs Use Schema Validation](#2-why-apis-use-schema-validation)
3. [The Joi Schema Structure](#3-the-joi-schema-structure)
4. [Common Joi Validators Used in Chatty](#4-common-joi-validators-used-in-chatty)
5. [The Error Response Format Chatty Returns](#5-the-error-response-format-chatty-returns)
6. [Every Joi Error Message in This Course](#6-every-joi-error-message-in-this-course)
7. [Joi Validation Errors vs Business Logic Errors](#7-joi-validation-errors-vs-business-logic-errors)
8. [How to Test Joi Validation](#8-how-to-test-joi-validation)
9. [Testing Joi Boundaries in Chatty Signup](#9-testing-joi-boundaries-in-chatty-signup)
10. [Testing Joi Boundaries in Chatty Signin](#10-testing-joi-boundaries-in-chatty-signin)
11. [How Joi Helps API Testers](#11-how-joi-helps-api-testers)
12. [Common Mistakes](#12-common-mistakes)
13. [Related Topics](#related-topics)

---

## 1. What Joi Is

Joi is a schema description and validation library for JavaScript and Node.js. It lets you describe the shape and rules of data — a string must be at least 4 characters, a number must be positive, an email must be a valid format — and then validate any JavaScript object against that description.

Joi is used on the **server side**, inside the API, not in test code. Your tests do not call Joi. Instead, your tests send HTTP requests and verify that Joi-powered validation inside the Chatty backend is working correctly.

### What Joi looks like on the server (you read this, you do not write it)

```javascript
// A Joi schema for the signup endpoint — inside Chatty's backend code
const signupSchema = Joi.object({
  username: Joi.string()
    .min(4)
    .max(8)
    .alphanum()
    .required(),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),

  password: Joi.string()
    .min(4)
    .max(8)
    .regex(/^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/)
    .required(),

  avatarColor: Joi.string()
    .required(),

  avatarImage: Joi.string()
    .optional()
    .allow('')
});
```

When a request arrives at `POST /auth/signup`, Chatty runs the incoming JSON body through this schema. If the body does not match, Joi immediately returns an error — the request never reaches the database.

---

## 2. Why APIs Use Schema Validation

### The problem without validation

Without input validation, an API is fragile:

- A client sends `username: 123` (a number) instead of a string. The code calls `username.toLowerCase()` and crashes with `TypeError: username.toLowerCase is not a function`.
- A client omits the `email` field. MongoDB saves a user document with no email. Later code that sends a confirmation email crashes because `user.email` is undefined.
- A client sends a 10,000-character password. The bcrypt hashing function takes 30 seconds to process it, and the server becomes unresponsive (a denial-of-service attack).

### What validation provides

Schema validation at the system boundary — before any business logic runs — provides:

| Benefit | Description |
|---------|-------------|
| Type safety | Ensures fields are the right type (string, number, boolean) |
| Range enforcement | Minimum and maximum lengths prevent edge cases and attacks |
| Required fields | Prevents null reference errors deeper in the code |
| Format validation | Email, URL, UUID formats are checked before processing |
| Consistent errors | Every validation failure returns the same error shape |
| Security | Rejects payloads designed to exploit the application |

### Where Joi fits in the request lifecycle

```
HTTP Request arrives
        |
        v
   Joi schema validation   ← Joi runs here, before anything else
        |
   Valid?  --No--> Return 400 + error message (Joi error)
        |
       Yes
        |
        v
   Business logic (check if user exists, check password, etc.)
        |
   Logic passes? --No--> Return 400/401/403 + error message (business error)
        |
               Yes
                |
                v
           Database operation
                |
                v
           Return 200/201 + success response
```

Joi acts as the first gate. If Joi rejects the request, the business logic never runs. This is why you can write tests that send obviously bad data (a 2-character username) and reliably get 400 back — Joi catches it immediately.

---

## 3. The Joi Schema Structure

Every Joi schema follows the same structural pattern:

```javascript
Joi.object({
  fieldName: Joi.type().validator().validator().modifier()
})
```

Breaking this down:

- `Joi.object({...})` — describes a JavaScript object with the named fields inside
- `fieldName` — the name of the field in the request body
- `Joi.type()` — declares the expected type: `Joi.string()`, `Joi.number()`, `Joi.boolean()`, `Joi.array()`
- `.validator()` — adds a rule: `.min(4)`, `.max(8)`, `.email()`, `.alphanum()`
- `.modifier()` — `.required()` means the field must be present; `.optional()` means it can be omitted

### Chaining validators

Multiple validators can be chained on the same field. All of them must pass for the field to be valid:

```javascript
Joi.string().min(4).max(8).alphanum().required()
// The value must be:
// - a string (not a number, array, or object)
// - at least 4 characters long
// - at most 8 characters long
// - only alphanumeric characters (A-Z, a-z, 0-9)
// - present in the request body (not omitted)
```

### allow('') — permitting empty strings

By default, `Joi.string()` rejects empty strings. `Joi.string().allow('')` explicitly allows an empty string:

```javascript
avatarImage: Joi.string().optional().allow('')
// The field may be:
// - absent from the request body (.optional())
// - an empty string ('')
// - a non-empty string
```

---

## 4. Common Joi Validators Used in Chatty

### String validators

| Validator | What it checks | Example |
|-----------|---------------|---------|
| `Joi.string()` | Value must be a string type | `"hello"` passes; `123` fails |
| `.min(n)` | String must be at least `n` characters | `.min(4)` — `"abc"` fails, `"abcd"` passes |
| `.max(n)` | String must be at most `n` characters | `.max(8)` — `"toolongval"` fails |
| `.email()` | Must be a valid email address format | `"a@b.com"` passes; `"notanemail"` fails |
| `.alphanum()` | Only letters and numbers — no spaces, hyphens, etc. | `"user123"` passes; `"user-123"` fails |
| `.pattern(regex)` | Must match the regular expression | Used for password complexity rules |
| `.required()` | Field must be present and non-null | Omitting the field fails |
| `.optional()` | Field may be omitted | No error if field is absent |
| `.allow('')` | Explicitly allows empty string | `Joi.string().allow('')` — `""` is valid |
| `.trim()` | Strips leading/trailing whitespace before validation | `"  hello  "` treated as `"hello"` |
| `.lowercase()` | Converts to lowercase before validation | `"HELLO"` treated as `"hello"` |

### Number validators

| Validator | What it checks |
|-----------|----------------|
| `Joi.number()` | Value must be a number |
| `.integer()` | Must be a whole number |
| `.min(n)` | Must be >= n |
| `.max(n)` | Must be <= n |
| `.positive()` | Must be > 0 |

### Other validators used in Chatty

| Validator | Use |
|-----------|-----|
| `Joi.array()` | Value must be an array |
| `Joi.boolean()` | Value must be a boolean |
| `Joi.alternatives()` | Value can be one of several types |

---

## 5. The Error Response Format Chatty Returns

When Joi validation fails, Chatty returns a consistent JSON error shape. Every single Joi error comes back as a `400 Bad Request` with this body:

```json
{
  "message": "Human-readable error message",
  "statusCode": 400,
  "status": "error"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | The human-readable description of what failed |
| `statusCode` | number | Always 400 for Joi validation errors |
| `status` | string | Always `"error"` |

### Asserting the error shape in tests

```typescript
const response = await apiClient.post('/auth/signup', {
  username: 'ab',   // too short — min is 4
  email: 'test@example.com',
  password: 'Vitest@123456!',
  avatarColor: 'blue',
  avatarImage: ''
});

expect(response.status).toBe(400);
expect(response.data.message).toBe('Invalid username');
expect(response.data.status).toBe('error');
expect(response.data.statusCode).toBe(400);
```

Note: always assert `response.status` (the HTTP status code from the response header) rather than `response.data.statusCode` (the value in the JSON body). The two should match, but `response.status` is authoritative.

---

## 6. Every Joi Error Message in This Course

These are the exact error messages returned by Chatty's Joi validation. These strings are load-bearing — copy them exactly into your assertions.

### Signup endpoint (`POST /auth/signup`)

| What you sent | Joi rule violated | Error message |
|---------------|-------------------|---------------|
| `username` shorter than 4 chars | `Joi.string().min(4)` | `'Invalid username'` |
| `username` longer than 8 chars | `Joi.string().max(8)` | `'Invalid username'` |
| `username` omitted | `.required()` | `'Invalid username'` |
| `username` with special characters (e.g. `user-1`) | `.alphanum()` | `'Invalid username'` |
| `password` shorter than 4 chars (Joi schema level) | `Joi.string().min(4)` | `'Invalid password'` |
| `password` longer than 8 chars (Joi schema level) | `Joi.string().max(8)` | `'Invalid password'` |
| `password` omitted | `.required()` | `'Invalid password'` |
| `email` in invalid format | `.email()` | `'Field must be valid'` |
| `email` omitted | `.required()` | `'Field must be valid'` |
| `avatarColor` omitted | `.required()` | `'Field must be valid'` |

**Important note on password validation:** Chatty applies two layers of password validation. The Joi schema validates the structure (length, character types). A separate business-logic check in the route handler validates the bcrypt hash. The Joi error message is `'Invalid password'`. The business logic error (wrong password at signin) uses a different message — see Section 7.

### Signin endpoint (`POST /auth/signin`)

| What you sent | Joi rule violated | Error message |
|---------------|-------------------|---------------|
| `username` shorter than 4 chars | `Joi.string().min(4)` | `'Invalid username'` |
| `username` omitted | `.required()` | `'Invalid username'` |
| `password` shorter than 4 chars | `Joi.string().min(4)` | `'Invalid password'` |
| `password` omitted | `.required()` | `'Invalid password'` |

---

## 7. Joi Validation Errors vs Business Logic Errors

Both Joi validation errors and business logic errors return HTTP 400. Understanding the difference helps you write precise tests.

### Joi validation errors

- Occur **before** any database or application logic runs
- Triggered by field structure problems: wrong type, too short, too long, missing, wrong format
- Consistent, predictable messages
- Never depend on the state of the database

```typescript
// This always returns 400 with 'Invalid username'
// regardless of what is in the database
// because the username is 2 chars, violating min(4)
const response = await apiClient.post('/auth/signup', {
  username: 'ab',
  email: 'test@example.com',
  password: 'Vitest@123456!',
  avatarColor: 'blue',
  avatarImage: ''
});

expect(response.status).toBe(400);
expect(response.data.message).toBe('Invalid username');
```

### Business logic errors

- Occur **after** Joi validation passes
- Triggered by logical conditions: user already exists, wrong password, resource not found
- Messages describe the logical problem, not a schema violation
- May depend on database state (for example, whether a username is already taken)

```typescript
// Joi passes — username is valid, password is valid
// But the credentials are wrong — this is a business logic error
const response = await apiClient.post('/auth/signin', {
  username: 'vitestUser',
  password: 'WrongPassword123!'
});

expect(response.status).toBe(400);
expect(response.data.message).toBe('Invalid credentials');
//                                  ^^^^^^^^^^^^^^^^^^^
//                                  This is NOT a Joi message
//                                  It comes from the auth logic after Joi passes
```

### Side-by-side comparison

| Aspect | Joi Validation Error | Business Logic Error |
|--------|---------------------|----------------------|
| HTTP status | 400 | 400 (sometimes 401, 403, 404) |
| When triggered | Before any logic runs | After Joi passes |
| Cause | Field too short/long/missing/wrong type | Username taken, wrong password, etc. |
| Example message | `'Invalid username'` | `'Invalid credentials'` |
| Depends on DB? | No | Often yes |
| Reproducible? | Always, with same bad input | May change if DB state changes |

---

## 8. How to Test Joi Validation

Testing Joi validation means deliberately sending requests that violate schema rules and asserting on the resulting error responses.

### Test categories

**1. Missing required fields**

```typescript
it('returns 400 when username is missing', async () => {
  const response = await apiClient.post('/auth/signup', {
    // username omitted
    email: 'vitest+test@example.com',
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toBe('Invalid username');
});
```

**2. Values that are too short (below .min())**

```typescript
it('returns 400 when username is too short', async () => {
  const response = await apiClient.post('/auth/signup', {
    username: 'abc',  // 3 chars — min is 4
    email: 'vitest+test@example.com',
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toBe('Invalid username');
});
```

**3. Values that are too long (above .max())**

```typescript
it('returns 400 when username is too long', async () => {
  const response = await apiClient.post('/auth/signup', {
    username: 'toolongusername',  // 15 chars — max is 8
    email: 'vitest+test@example.com',
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toBe('Invalid username');
});
```

**4. Wrong format (.email(), .alphanum(), .pattern())**

```typescript
it('returns 400 when email format is invalid', async () => {
  const response = await apiClient.post('/auth/signup', {
    username: 'vitestUser',
    email: 'this-is-not-an-email',
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toBe('Field must be valid');
});
```

**5. Boundary values (exactly at the limit)**

```typescript
it('accepts username of exactly 4 characters (minimum boundary)', async () => {
  const response = await apiClient.post('/auth/signup', {
    username: 'vita',  // exactly 4 chars — should pass
    email: `vitest+${Date.now()}@example.com`,
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  // 4 chars is valid — Joi passes
  // But the user may or may not already exist — accept 200 or 400 "User already exists"
  expect([200, 400]).toContain(response.status);
  if (response.status === 400) {
    expect(response.data.message).not.toBe('Invalid username');
  }
});

it('returns 400 for username of exactly 3 characters (one below minimum)', async () => {
  const response = await apiClient.post('/auth/signup', {
    username: 'vit',  // exactly 3 chars — one below min
    email: `vitest+${Date.now()}@example.com`,
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  expect(response.status).toBe(400);
  expect(response.data.message).toBe('Invalid username');
});
```

**6. Wrong type (sending a number where a string is expected)**

```typescript
it('returns 400 when username is a number instead of a string', async () => {
  const response = await apiClient.post('/auth/signup', {
    username: 12345,  // number, not string
    email: 'vitest+test@example.com',
    password: 'Vitest@123456!',
    avatarColor: 'blue',
    avatarImage: ''
  });

  // Joi.string() rejects non-strings
  expect(response.status).toBe(400);
});
```

---

## 9. Testing Joi Boundaries in Chatty Signup

The full boundary test suite for the signup endpoint covers all field constraints.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../src/apiClient';
import { faker } from '@faker-js/faker';

describe('POST /auth/signup — Joi validation', () => {
  // We use a known-valid body as the base, then modify individual fields
  const validBody = {
    username: 'vita1234',       // 8 chars, alphanum — valid
    email: `vitest+signup-${Date.now()}@example.com`,
    password: 'Vitest@123456!',
    avatarColor: 'red',
    avatarImage: ''
  };

  // Username validation
  describe('username field', () => {
    it('returns 400 with "Invalid username" when username is 3 chars (below min of 4)', async () => {
      const res = await apiClient.post('/auth/signup', { ...validBody, username: 'vit' });
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });

    it('returns 400 with "Invalid username" when username is 9 chars (above max of 8)', async () => {
      const res = await apiClient.post('/auth/signup', { ...validBody, username: 'vitestmike' });
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });

    it('returns 400 with "Invalid username" when username contains a hyphen', async () => {
      const res = await apiClient.post('/auth/signup', { ...validBody, username: 'vite-123' });
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });

    it('returns 400 with "Invalid username" when username is omitted', async () => {
      const { username, ...bodyWithoutUsername } = validBody;
      const res = await apiClient.post('/auth/signup', bodyWithoutUsername);
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });
  });

  // Password validation
  describe('password field', () => {
    it('returns 400 with "Invalid password" when password is 3 chars (below min of 4)', async () => {
      const res = await apiClient.post('/auth/signup', { ...validBody, password: 'V@1' });
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid password');
    });

    it('returns 400 with "Invalid password" when password is omitted', async () => {
      const { password, ...bodyWithoutPassword } = validBody;
      const res = await apiClient.post('/auth/signup', bodyWithoutPassword);
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid password');
    });
  });

  // Email validation
  describe('email field', () => {
    it('returns 400 with "Field must be valid" when email has no @ symbol', async () => {
      const res = await apiClient.post('/auth/signup', { ...validBody, email: 'notanemail' });
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Field must be valid');
    });

    it('returns 400 with "Field must be valid" when email has no domain', async () => {
      const res = await apiClient.post('/auth/signup', { ...validBody, email: 'user@' });
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Field must be valid');
    });

    it('returns 400 with "Field must be valid" when email is omitted', async () => {
      const { email, ...bodyWithoutEmail } = validBody;
      const res = await apiClient.post('/auth/signup', bodyWithoutEmail);
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Field must be valid');
    });
  });

  // avatarColor validation
  describe('avatarColor field', () => {
    it('returns 400 with "Field must be valid" when avatarColor is omitted', async () => {
      const { avatarColor, ...bodyWithoutColor } = validBody;
      const res = await apiClient.post('/auth/signup', bodyWithoutColor);
      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Field must be valid');
    });
  });
});
```

---

## 10. Testing Joi Boundaries in Chatty Signin

Signin has simpler Joi rules but the same pattern applies.

```typescript
describe('POST /auth/signin — Joi validation', () => {
  const validSignin = {
    username: 'vitestmike',
    password: 'Vitest@123456!'
  };

  it('returns 400 with "Invalid username" when username is 3 chars', async () => {
    const res = await apiClient.post('/auth/signin', {
      ...validSignin,
      username: 'vit'
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid username');
  });

  it('returns 400 with "Invalid username" when username is omitted', async () => {
    const res = await apiClient.post('/auth/signin', {
      password: validSignin.password
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid username');
  });

  it('returns 400 with "Invalid password" when password is 3 chars', async () => {
    const res = await apiClient.post('/auth/signin', {
      ...validSignin,
      password: 'V@1'
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid password');
  });

  it('returns 400 with "Invalid password" when password is omitted', async () => {
    const res = await apiClient.post('/auth/signin', {
      username: validSignin.username
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid password');
  });

  it('returns 400 with "Invalid credentials" when credentials are wrong (business logic, not Joi)', async () => {
    // Both fields pass Joi validation — username is valid length, password is valid length
    // The failure happens in the business logic layer (password hash does not match)
    const res = await apiClient.post('/auth/signin', {
      username: 'vitestmike',
      password: 'Vitest@WrongPass!'
    });
    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid credentials');
    // NOTE: message is 'Invalid credentials', not 'Invalid password'
    // 'Invalid password' = Joi schema error
    // 'Invalid credentials' = business logic error
  });
});
```

---

## 11. How Joi Helps API Testers

From a testing perspective, Joi validation is a feature that makes your tests more reliable and easier to write.

### Deterministic error responses

Because Joi validates before any logic runs, you can send a bad request and always get the same error response — regardless of database state, server load, or time of day. A 3-character username will always return `400 "Invalid username"`.

### Boundary testing is straightforward

When you know the Joi schema rules — and you can read them from the API documentation or infer them from the error messages — you know exactly where the boundaries are. You can write min-1, min, max, max+1 tests with confidence.

```
min(4) → test 3 chars (fail), test 4 chars (pass)
max(8) → test 8 chars (pass), test 9 chars (fail)
```

### The error messages document the schema

When you run a test that sends a 3-character username and get back `'Invalid username'`, you have just verified two things simultaneously:
1. The validation exists and is enforced.
2. The error message returned to the client is exactly `'Invalid username'`.

This means your assertions on the `message` field serve as a living specification of the API's error responses.

### Knowing what 400 means

When you get a 400, you can immediately determine whether it came from Joi (structural problem) or business logic (logical problem) by examining the message:

- `'Invalid username'` — Joi: username length or character problem
- `'Invalid password'` — Joi: password length problem
- `'Field must be valid'` — Joi: email or other format problem
- `'Invalid credentials'` — Business logic: correct structure, wrong password
- `'User already exists...'` — Business logic: correct structure, duplicate user

---

## 12. Common Mistakes

### Mistake 1: Confusing Joi error message with business logic error message

```typescript
// WRONG — 'Invalid credentials' is a business logic error, not a Joi error
// It means the username/password pair is wrong, not that the format is bad
it('returns 400 when password is too short', async () => {
  const res = await apiClient.post('/auth/signin', {
    username: 'vitestmike',
    password: 'V@1'  // 3 chars — Joi min is 4
  });
  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Invalid credentials');  // WRONG message
  // Correct: expect(res.data.message).toBe('Invalid password');
});
```

### Mistake 2: Testing validation with a username that might already exist

```typescript
// RISKY — if 'vita' is already registered, you get a business logic 400
// ('User already exists') instead of a Joi 400 ('Invalid username')
// when you test edge cases near the boundary
it('accepts 4-char username', async () => {
  const res = await apiClient.post('/auth/signup', {
    username: 'vita',  // exactly 4 chars
    email: 'vitest+vita@example.com',
    // ...
  });
  expect(res.status).toBe(200);  // COULD FAIL if 'vita' is taken
});

// BETTER — use a unique email and timestamp to avoid conflicts
it('accepts 4-char username', async () => {
  const res = await apiClient.post('/auth/signup', {
    username: 'vita',
    email: `vitest+vita-${Date.now()}@example.com`,
    // ...
  });
  // Accept 200 (created) but reject 'Invalid username' specifically
  if (res.status === 400) {
    expect(res.data.message).not.toBe('Invalid username');
  }
});
```

### Mistake 3: Asserting only the status code, not the message

```typescript
// WEAK — a 400 from Joi and a 400 from business logic look the same
it('returns 400 for short username', async () => {
  const res = await apiClient.post('/auth/signup', { username: 'ab', ... });
  expect(res.status).toBe(400);  // Passes for wrong reasons if business logic returns 400 too
});

// STRONG — pins down the exact error
it('returns 400 for short username', async () => {
  const res = await apiClient.post('/auth/signup', { username: 'ab', ... });
  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Invalid username');  // Confirms it is the Joi error
});
```

### Mistake 4: Sending an empty string for a required field

```typescript
// Empty string and missing field can behave differently
// Joi.string().required() rejects undefined (missing) AND empty string
// Joi.string().allow('').required() rejects undefined but allows ''

// If you want to test a missing field, omit it from the object entirely
// Do not send { username: '' } when you want to test "missing username"
```

### Mistake 5: Not cleaning up after boundary tests that create users

```typescript
// If a boundary test accidentally creates a valid user (e.g., testing the exact minimum
// valid length), that user must be cleaned up. Otherwise the next test run fails
// with "User already exists" instead of the Joi error you are testing.

afterAll(async () => {
  if (authId) {
    await apiClient.delete(`/test/cleanup/user/${authId}`, {
      headers: { 'x-test-secret': process.env.TEST_SECRET }
    });
  }
});
```

---

## Related Topics

- [Boundary Testing](boundary-testing.md) — min-1, min, max, max+1 patterns for testing Joi constraints
- [Negative Testing](negative-testing.md) — Testing all the ways an endpoint can return 400, 401, 403
- [HTTP Status Codes](http-status-codes.md) — 400 Bad Request in detail: Joi errors vs business errors
- [HTTP Requests](http-requests.md) — Sending POST bodies with Axios
- [Vitest](vitest.md) — Writing the expect assertions that verify Joi error messages

## Official Documentation

- [Joi — Official docs](https://joi.dev/api/)
- [Joi GitHub](https://github.com/hapijs/joi)
- [Joi — API reference](https://joi.dev/api/?v=17.x)
