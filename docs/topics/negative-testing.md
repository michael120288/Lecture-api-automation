# Negative Testing

**Related topics:** [Positive Testing](positive-testing.md) | [Boundary Testing](boundary-testing.md) | [HTTP Status Codes](http-status-codes.md) | [What Is API Testing](what-is-api-testing.md)

---

## 1. What Is Negative Testing?

**Negative testing** verifies that the system handles invalid, unexpected, or unauthorized inputs correctly. Instead of providing valid data, you deliberately provide bad data — and you assert that the system responds with the right error.

Negative tests answer the question: **does this feature fail safely and informatively when used incorrectly?**

```typescript
// Negative test — wrong password, expected error
it('returns 400 with wrong password', async () => {
  const res = await axios.post(`${BASE_URL}/signin`, {
    username: 'vitestmike',
    password: 'wrongpassword',
  }, { validateStatus: () => true });

  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Invalid credentials');
});
```

---

## 2. Why Negative Tests Matter More Than You Think

Most beginners write only positive tests. This is a mistake. Here is why negative tests are equally important.

### Business rules are enforced by error responses

A "you cannot delete another user's post" rule is not visible when everything works. It only becomes visible when you try to break it. If you never write a test that attempts the unauthorized operation, you never verify the rule exists.

### Validation is a security boundary

API validation is the first line of defense against bad data entering your system. If the server does not reject `{ username: "x", password: "" }`, it may create a user with an unusable username. Negative tests verify these boundaries hold.

### Error messages are part of your contract

Users and downstream services rely on error messages to understand what went wrong and how to fix it. If `POST /signin` returns `'Wrong password'` instead of `'Invalid credentials'`, every client that pattern-matches on that string breaks. Asserting exact error messages catches this.

### Negative tests find security bugs

Some of the most critical bugs are found by doing things you are not supposed to do:
- Accessing another user's data
- Calling a privileged endpoint without authentication
- Sending oversized payloads
- Using expired sessions

---

## 3. Categories of Negative Tests

### 3.1 Missing Required Fields

The server must reject requests where required fields are absent.

```typescript
// Missing password
it('returns 400 when password is missing', async () => {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestmike' },  // no password
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
});

// Missing all fields
it('returns 400 with empty body', async () => {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    {},
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
});

// Missing required comment field
it('returns 400 when comment text is missing', async () => {
  const res = await axios.post(
    `${BASE_URL}/post/comment`,
    {
      userTo: userId,
      postId: postId,
      // comment: 'missing'  ← intentionally omitted
    },
    { headers: { Cookie: cookie }, validateStatus: () => true }
  );

  expect(res.status).toBe(400);
});
```

### 3.2 Wrong Field Types

The server must reject fields with incorrect types.

```typescript
// Sending a number where a string is expected
it('returns 400 when username is a number', async () => {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    { username: 12345, password: 'Vitest@123456' },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
});
```

### 3.3 Wrong Field Values (Invalid Data)

The server must reject data that fails business rules.

```typescript
// Wrong password
it('returns 400 with wrong password', async () => {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestmike', password: 'wrongpassword' },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Invalid credentials');
});

// Invalid email format
it('returns 400 with malformed email', async () => {
  const res = await axios.post(
    `${BASE_URL}/signup`,
    {
      username: 'vitestuser',
      email: 'not-an-email',   // invalid format
      password: 'Vitest@123456',
      avatarColor: '#4a90e2',
      avatarImage: 'https://example.com/img.jpg',
    },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Email must be valid');
});
```

### 3.4 Unauthorized Access (No Authentication)

Requests to protected endpoints without a session cookie must return 401.

```typescript
// No cookie on a protected endpoint
it('returns 401 when no cookie is provided', async () => {
  const res = await axios.get(
    `${BASE_URL}/currentuser`,
    { validateStatus: () => true }
    // No Cookie header
  );

  expect(res.status).toBe(401);
});

it('returns 401 when getting posts without authentication', async () => {
  const res = await axios.get(
    `${BASE_URL}/post/all/1`,
    { validateStatus: () => true }
  );

  expect(res.status).toBe(401);
});

// After signout, the cookie becomes invalid
it('returns 401 after signing out', async () => {
  const signinRes = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestmike', password: 'Vitest@123456' },
    { validateStatus: () => true }
  );
  const cookie = signinRes.headers['set-cookie']![0].split(';')[0];

  // Sign out
  await axios.post(`${BASE_URL}/signout`, {}, {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  });

  // Try to use the now-invalid cookie
  const afterSignoutRes = await axios.get(`${BASE_URL}/currentuser`, {
    headers: { Cookie: cookie },
    validateStatus: () => true,
  });

  expect(afterSignoutRes.status).toBe(401);
});
```

### 3.5 Forbidden Access (Wrong User)

Being authenticated is not enough — you must be the right authenticated user.

```typescript
// Try to update another user's post
it('returns 403 when updating another user\'s post', async () => {
  // Setup: two users, each with their own cookie
  // userACookie — the owner of the post
  // userBCookie — a different authenticated user

  const res = await axios.patch(
    `${BASE_URL}/post/${userAPostId}`,
    { post: 'I am trying to edit your post' },
    {
      headers: { Cookie: userBCookie },  // wrong user
      validateStatus: () => true,
    }
  );

  expect(res.status).toBe(403);
});

// Test cleanup with wrong secret
it('returns 403 for test cleanup with wrong secret header', async () => {
  const res = await axios.delete(
    `${BASE_URL}/test/cleanup/user/${authId}`,
    {
      headers: { 'x-test-secret': 'incorrect-secret' },
      validateStatus: () => true,
    }
  );

  expect(res.status).toBe(403);
  expect(res.data.message).toBe('Forbidden: invalid test secret');
});
```

### 3.6 Not Found

Requesting a resource that does not exist must return 404.

```typescript
// Non-existent user in cleanup
it('returns 404 for cleanup of a non-existent authId', async () => {
  const fakeAuthId = '507f1f77bcf86cd799430000';  // valid format, non-existent

  const res = await axios.delete(
    `${BASE_URL}/test/cleanup/user/${fakeAuthId}`,
    {
      headers: { 'x-test-secret': 'chatty-test-cleanup-2026' },
      validateStatus: () => true,
    }
  );

  expect(res.status).toBe(404);
  expect(res.data.statusCode).toBe(404);
});
```

### 3.7 Duplicate Data

The server must reject attempts to create resources that already exist.

```typescript
// Try to sign up with an already-taken username
it('returns 400 when username is already taken', async () => {
  const existingUsername = 'vitestmike';  // this user already exists

  const res = await axios.post(
    `${BASE_URL}/signup`,
    {
      username: existingUsername,
      email: 'different@test.com',
      password: 'Vitest@123456',
      avatarColor: '#4a90e2',
      avatarImage: 'https://example.com/img.jpg',
    },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
  expect(res.data.message).toBe('User already exists. Username or email is already taken.');
});

// Try to sign up with an already-taken email
it('returns 400 when email is already registered', async () => {
  const res = await axios.post(
    `${BASE_URL}/signup`,
    {
      username: `vitestnewuser${Date.now()}`,  // unique username
      email: 'mike@test.com',                  // already registered
      password: 'Vitest@123456',
      avatarColor: '#4a90e2',
      avatarImage: 'https://example.com/img.jpg',
    },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
  expect(res.data.message).toBe('User already exists. Username or email is already taken.');
});
```

---

## 4. Asserting Error Messages

Error messages are part of the API contract. Assert their exact text.

```typescript
// Chatty error shape for every 4xx response:
// { message: string, statusCode: number, status: 'error' }

it('returns the correct error message for invalid credentials', async () => {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestmike', password: 'wrongpassword' },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
  expect(res.data.message).toBe('Invalid credentials');
  expect(res.data.status).toBe('error');
  expect(res.data.statusCode).toBe(400);
});
```

**Why "both user not found" and "wrong password" return the same message:**

Chatty uses `'Invalid credentials'` for both "username does not exist" and "wrong password". This is an intentional security design called **username enumeration prevention**. If the API returned different messages for each case, an attacker could use the signin endpoint to check whether any given username exists in the system.

By returning the same message for both cases, the API reveals nothing about whether the username exists.

```typescript
// Both of these should return 400 with the SAME message
it('returns same message for non-existent user and wrong password', async () => {
  const wrongPasswordRes = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestmike', password: 'wrongpassword' },
    { validateStatus: () => true }
  );

  const nonExistentUserRes = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestdoesnotexist', password: 'Vitest@123456' },
    { validateStatus: () => true }
  );

  expect(wrongPasswordRes.status).toBe(400);
  expect(nonExistentUserRes.status).toBe(400);
  expect(wrongPasswordRes.data.message).toBe('Invalid credentials');
  expect(nonExistentUserRes.data.message).toBe('Invalid credentials');

  // Same message — prevents username enumeration
  expect(wrongPasswordRes.data.message).toBe(nonExistentUserRes.data.message);
});
```

---

## 5. Asserting Fields Are NOT Present in Error Responses

Error responses should never leak sensitive information. Assert that sensitive fields are absent.

```typescript
it('does not expose sensitive data in a failed signin response', async () => {
  const res = await axios.post(
    `${BASE_URL}/signin`,
    { username: 'vitestmike', password: 'wrongpassword' },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);

  // Must not reveal any user data
  expect(res.data.user).toBeUndefined();
  expect(res.data.token).toBeUndefined();
  expect(res.data.password).toBeUndefined();

  // Should only have the error envelope
  expect(res.data.message).toBeDefined();
  expect(res.data.status).toBe('error');
});
```

```typescript
it('does not expose a token when signup fails', async () => {
  const res = await axios.post(
    `${BASE_URL}/signup`,
    {
      username: 'ab',  // too short — will fail validation
      email: 'test@test.com',
      password: 'Vitest@123456',
      avatarColor: '#4a90e2',
      avatarImage: 'https://example.com/img.jpg',
    },
    { validateStatus: () => true }
  );

  expect(res.status).toBe(400);
  expect(res.data.token).toBeUndefined();
  expect(res.data.user).toBeUndefined();
  expect(res.headers['set-cookie']).toBeUndefined();
});
```

---

## 6. A Complete Negative Test Suite for POST /signin

```typescript
import axios from 'axios';
import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://api.codeandtest.com/api/v1';

describe('POST /signin — negative tests', () => {
  const validUsername = 'vitestmike';
  const validPassword = 'Vitest@123456';
  const opts = { validateStatus: () => true };

  describe('field validation', () => {
    it('returns 400 when username is too short (< 4 chars)', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'abc',
        password: validPassword,
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });

    it('returns 400 when username is too long (> 32 chars)', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'a'.repeat(33),
        password: validPassword,
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });

    it('returns 400 when password is too short (< 8 chars)', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
        password: 'short',
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid password');
    });

    it('returns 400 when username is missing', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        password: validPassword,
      }, opts);

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
      }, opts);

      expect(res.status).toBe(400);
    });
  });

  describe('authentication', () => {
    it('returns 400 with wrong password', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
        password: 'WrongPassword@123',
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid credentials');
    });

    it('returns 400 with non-existent username', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'vitestdoesnotexist999',
        password: validPassword,
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid credentials');
    });
  });

  describe('error response shape', () => {
    it('error response contains message, status, statusCode', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
        password: 'wrongpassword',
      }, opts);

      expect(res.status).toBe(400);
      expect(typeof res.data.message).toBe('string');
      expect(res.data.status).toBe('error');
      expect(typeof res.data.statusCode).toBe('number');
    });

    it('error response does not leak sensitive fields', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
        password: 'wrongpassword',
      }, opts);

      expect(res.data.user).toBeUndefined();
      expect(res.data.token).toBeUndefined();
      expect(res.data.password).toBeUndefined();
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });
});
```

---

## 7. A Complete Negative Test Suite for POST /signup

```typescript
describe('POST /signup — negative tests', () => {
  const validBase = {
    email: `vitestvalid${Date.now()}@test.com`,
    password: 'Vitest@123456',
    avatarColor: '#4a90e2',
    avatarImage: 'https://res.cloudinary.com/example/image/upload/placeholder.jpg',
  };
  const opts = { validateStatus: () => true };

  it('returns 400 when username is too short', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...validBase,
      username: 'abc',
    }, opts);

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Username must be at least 4 characters');
  });

  it('returns 400 when password has no special character', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...validBase,
      username: 'vitestnospecialchar',
      password: 'VitestNoSpecial123',  // no special char
    }, opts);

    expect(res.status).toBe(400);
    expect(res.data.message).toContain('must contain at least one');
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...validBase,
      username: 'vitestbademail',
      email: 'not-an-email',
    }, opts);

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Email must be valid');
  });

  it('returns 400 for a duplicate username', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...validBase,
      username: 'vitestmike',  // known existing user
      email: `newunique${Date.now()}@test.com`,
    }, opts);

    expect([400, 429]).toContain(res.status);
    if (res.status === 400) {
      expect(res.data.message).toBe('User already exists. Username or email is already taken.');
    }
  });
});
```

---

## 8. Negative Tests for Authenticated Endpoints

```typescript
describe('Authenticated endpoints — negative tests', () => {
  it('GET /currentuser returns 401 without cookie', async () => {
    const res = await axios.get(`${BASE_URL}/currentuser`, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(401);
  });

  it('POST /post returns 401 without cookie', async () => {
    const res = await axios.post(`${BASE_URL}/post`, {
      post: 'Test',
      bgColor: '#fff',
      privacy: 'Public',
    }, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /user/following returns 401 without cookie', async () => {
    const res = await axios.get(`${BASE_URL}/user/following`, {
      validateStatus: () => true,
    });
    expect(res.status).toBe(401);
  });
});
```

---

## 9. Common Mistakes in Negative Tests

| Mistake | Problem | Fix |
|---------|---------|-----|
| Forgetting `validateStatus: () => true` | 4xx throws an exception | Always set it |
| Not asserting the error message, only the status | A 400 with the wrong message is still a bug | Assert both `res.status` and `res.data.message` |
| Expecting `404` for non-existent username at signin | Chatty returns 400 with "Invalid credentials" for security | Assert the actual status returned |
| Not testing both "no cookie" and "wrong cookie" | These are different auth failures | Test both scenarios |
| Using real user data in negative tests | Might hit real rate limits or create side effects | Use clearly invalid data |
| Asserting that a field is `null` instead of `undefined` | Missing JSON fields are `undefined`, not `null` | Use `toBeUndefined()` for absent fields |

---

## Related Topics

- [Positive Testing](positive-testing.md) — testing the happy path
- [Boundary Testing](boundary-testing.md) — the exact edges between valid and invalid
- [HTTP Status Codes](http-status-codes.md) — 400, 401, 403, 404 in detail
- [HTTP Headers](http-headers.md) — testing the Cookie header and its absence

## Official Documentation

- [ISTQB Glossary — Negative testing](https://glossary.istqb.org/en_US/term/negative-testing)
- [OWASP — Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
