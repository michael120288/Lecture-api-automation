# Boundary Testing

**Related topics:** [Negative Testing](negative-testing.md) | [Positive Testing](positive-testing.md) | [HTTP Status Codes](http-status-codes.md) | [What Is API Testing](what-is-api-testing.md)

---

## 1. What Is Boundary Testing?

**Boundary testing** (also called **boundary value analysis**, or BVA) is the practice of testing the exact edges of valid and invalid input ranges. Bugs in input validation most commonly appear at the boundaries — the first allowed value, the last allowed value, and the values just outside each end.

The fundamental insight of boundary testing is that software tends to fail at the transition points. A developer writes `if (username.length >= 4)` — but did they write `>=` or `>`? Is the boundary inclusive or exclusive? The only way to know for certain is to test the values on and around the boundary.

---

## 2. Off-by-One Errors

An **off-by-one error** occurs when a boundary is off by exactly one unit. They are extremely common in validation logic.

Consider a rule: "username must be at least 4 characters long."

The developer writes the condition. Possible mistakes:

```typescript
// Correct
if (username.length >= 4) { /* valid */ }

// Off-by-one (rejects 4-char usernames)
if (username.length > 4) { /* valid */ }

// Off-by-one (accepts 3-char usernames)
if (username.length >= 3) { /* valid */ }
```

If you only test with `username = 'ab'` (clearly too short) and `username = 'vitestmike'` (clearly long enough), all three versions of the condition behave identically. Only by testing with exactly 3 chars, exactly 4 chars, and exactly 5 chars can you distinguish between them.

```
Input:    3 chars    4 chars    5 chars
          -------    -------    -------
Correct:  INVALID    VALID      VALID
Bug 1:    INVALID    INVALID    VALID    ← off by one
Bug 2:    VALID      VALID      VALID    ← off by one
```

---

## 3. Boundary Value Analysis: The Three-Point Method

For any boundary, test three values:

1. **Just below the boundary** (should be invalid)
2. **Exactly at the boundary** (should be valid — boundary is inclusive)
3. **Just above the boundary** (should be valid)

For a minimum boundary of 4:

| Value | Length | Expected | Why |
|-------|--------|---------|-----|
| `'abc'` | 3 | Invalid (400) | One below minimum |
| `'abcd'` | 4 | Valid (200 or 201) | Exactly the minimum |
| `'abcde'` | 5 | Valid (200 or 201) | One above minimum |

For a maximum boundary of 20:

| Value | Length | Expected | Why |
|-------|--------|---------|-----|
| `'a'.repeat(19)` | 19 | Valid | One below maximum |
| `'a'.repeat(20)` | 20 | Valid | Exactly the maximum |
| `'a'.repeat(21)` | 21 | Invalid (400) | One above maximum |

---

## 4. Chatty's Specific Boundaries

### 4.1 Username (`POST /signup`)

| Constraint | Value | Rule |
|------------|-------|------|
| Minimum | 4 characters | `username.length >= 4` |
| Maximum | 20 characters | `username.length <= 20` |

**Boundary tests:**

```typescript
describe('username boundary — POST /signup', () => {
  const base = {
    email: `vitest${Date.now()}@test.com`,
    password: 'Vitest@123456',
    avatarColor: '#4a90e2',
    avatarImage: 'https://res.cloudinary.com/example/image/upload/placeholder.jpg',
  };
  const opts = { validateStatus: () => true };

  // Minimum boundary
  it('returns 400 for username of 3 chars (one below min)', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      username: 'vit',  // 3 chars — invalid
    }, opts);

    expect([400, 429]).toContain(res.status);
    if (res.status === 400) {
      expect(res.data.message).toBe('Username must be at least 4 characters');
    }
  });

  it('returns 201 for username of exactly 4 chars (at min)', async () => {
    const username = `vit${Date.now()}`.slice(0, 4);  // exactly 4 chars
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      username,
      email: `${username}@test.com`,
    }, opts);

    expect([201, 429]).toContain(res.status);
    // If 201: minimum boundary is correct
  });

  it('is valid for username of 5 chars (one above min)', async () => {
    const username = `vite${Date.now()}`.slice(0, 5);
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      username,
      email: `${username}@test.com`,
    }, opts);

    expect([201, 429]).toContain(res.status);
  });

  // Maximum boundary
  it('is valid for username of exactly 20 chars (at max)', async () => {
    const username = `vitest${Date.now()}00`.slice(0, 20);
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      username,
      email: `${username}@test.com`,
    }, opts);

    expect([201, 429]).toContain(res.status);
  });

  it('returns 400 for username of 21 chars (one above max)', async () => {
    const username = 'vitest'.padEnd(21, '0');  // 21 chars
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      username,
    }, opts);

    expect([400, 429]).toContain(res.status);
    if (res.status === 400) {
      expect(res.data.message).toBe('Username cannot exceed 20 characters');
    }
  });
});
```

### 4.2 Signup Password

| Constraint | Value | Rule |
|------------|-------|------|
| Minimum length | 12 characters | `password.length >= 12` |
| Maximum length | 128 characters | `password.length <= 128` |
| Character requirements | Must contain: uppercase, lowercase, digit, special (`@$!%*?&`) | Regex validation |

**Boundary tests for minimum length:**

```typescript
describe('signup password length boundary', () => {
  const opts = { validateStatus: () => true };

  it('returns 400 for password of 11 chars (one below min)', async () => {
    // 11 chars that meet all other requirements: uppercase, lowercase, digit, special
    const password = 'Vitest@1234';  // 11 chars
    expect(password.length).toBe(11);

    const res = await axios.post(`${BASE_URL}/signup`, {
      username: `vitestpwd${Date.now()}`.slice(0, 12),
      email: `vitestpwd${Date.now()}@test.com`,
      password,
      avatarColor: '#4a90e2',
      avatarImage: 'https://res.cloudinary.com/example/image/upload/placeholder.jpg',
    }, opts);

    expect([400, 429]).toContain(res.status);
    if (res.status === 400) {
      expect(res.data.message).toBe('Password must be at least 12 characters long');
    }
  });

  it('returns 201 for password of exactly 12 chars (at min)', async () => {
    const password = 'Vitest@12345';  // exactly 12 chars
    expect(password.length).toBe(12);

    const username = `vitestpwd${Date.now()}`.slice(0, 12);
    const res = await axios.post(`${BASE_URL}/signup`, {
      username,
      email: `${username}@test.com`,
      password,
      avatarColor: '#4a90e2',
      avatarImage: 'https://res.cloudinary.com/example/image/upload/placeholder.jpg',
    }, opts);

    expect([201, 429]).toContain(res.status);
  });
});
```

**Boundary tests for character requirements (combinatorial):**

The password must contain at least one character from each of these sets: uppercase `[A-Z]`, lowercase `[a-z]`, digit `[0-9]`, special `[@$!%*?&]`.

Testing the boundary here means: what happens if exactly one requirement is missing?

```typescript
describe('signup password character requirement boundary', () => {
  const opts = { validateStatus: () => true };
  const base = {
    username: 'vitestpwdtest',
    email: 'vitestpwdtest@test.com',
    avatarColor: '#4a90e2',
    avatarImage: 'https://res.cloudinary.com/example/image/upload/placeholder.jpg',
  };
  const validPassword = 'Vitest@123456';  // satisfies all requirements

  it('returns 400 when uppercase is missing', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      password: 'vitest@123456',  // no uppercase
    }, opts);

    expect([400, 429]).toContain(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('must contain');
    }
  });

  it('returns 400 when lowercase is missing', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      password: 'VITEST@123456',  // no lowercase
    }, opts);

    expect([400, 429]).toContain(res.status);
  });

  it('returns 400 when digit is missing', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      password: 'Vitest@abcdef',  // no digit
    }, opts);

    expect([400, 429]).toContain(res.status);
  });

  it('returns 400 when special char is missing', async () => {
    const res = await axios.post(`${BASE_URL}/signup`, {
      ...base,
      password: 'Vitest1234567',  // no special char
    }, opts);

    expect([400, 429]).toContain(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('special character');
    }
  });
});
```

### 4.3 Signin Username and Password (Validation-Only Boundaries)

Note: `POST /signin` validates field format before checking the database. Its boundaries are looser than signup because the signin route only validates that you sent something reasonable — the real auth happens by querying the database.

| Constraint | Value |
|------------|-------|
| Username minimum | 4 characters |
| Username maximum | 32 characters |
| Password minimum | 8 characters |
| Password maximum | 128 characters |

```typescript
describe('signin field validation boundaries', () => {
  const opts = { validateStatus: () => true };

  it('returns 400 for username of 3 chars at signin', async () => {
    const res = await axios.post(`${BASE_URL}/signin`, {
      username: 'abc',     // 3 chars — below minimum
      password: 'Vitest@123456',
    }, opts);

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid username');
  });

  it('returns 400 for username of 33 chars at signin', async () => {
    const res = await axios.post(`${BASE_URL}/signin`, {
      username: 'v'.repeat(33),  // 33 chars — above maximum
      password: 'Vitest@123456',
    }, opts);

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid username');
  });

  it('returns 400 for password of 7 chars at signin', async () => {
    const res = await axios.post(`${BASE_URL}/signin`, {
      username: 'vitestmike',
      password: 'short1!',  // 7 chars — below minimum
    }, opts);

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Invalid password');
  });
});
```

---

## 5. The `expectRejected([400, 429])` Pattern

Boundary tests that touch the signup or signin endpoints face a practical challenge: the rate limiter on the `auth` zone allows only 5 requests per minute (plus a burst of 5). When you run multiple boundary tests in sequence, you will sometimes get `429 Too Many Requests` instead of `400 Bad Request` — even when your input is genuinely invalid.

The `expectRejected` pattern accepts both as valid outcomes in boundary tests:

```typescript
// Helper function — accepts any status that represents "the request was rejected"
function expectRejected(res: { status: number }, validRejectionCodes: number[] = [400, 429]): void {
  expect(validRejectionCodes).toContain(res.status);
}

// Usage
it('returns 400 or 429 for a username that is too short', async () => {
  const res = await axios.post(`${BASE_URL}/signup`, {
    username: 'ab',
    email: 'ab@test.com',
    password: 'Vitest@123456',
    avatarColor: '#4a90e2',
    avatarImage: 'https://example.com/img.jpg',
  }, { validateStatus: () => true });

  expect([400, 429]).toContain(res.status);
  if (res.status === 400) {
    expect(res.data.message).toBe('Username must be at least 4 characters');
  }
});
```

The conditional message assertion (`if (res.status === 400)`) is important: only assert the error message when you actually got a 400. When you got 429, the body is different (it is a rate-limit response from nginx, not from the application).

### When to Use This Pattern

Use `[400, 429]` in:
- Signup validation boundary tests (any repeated calls to `POST /signup`)
- Signin validation boundary tests (any repeated calls to `POST /signin`)
- Anywhere you call the `auth` rate-limit zone more than 5 times in a test run

Do not use it for non-auth endpoints, which use the more permissive `api` zone (30 req/second).

---

## 6. Equivalence Partitioning

**Equivalence partitioning** is the companion concept to boundary value analysis. While BVA focuses on the edges, equivalence partitioning divides the full input space into groups (partitions) where all values in a group are expected to behave identically.

The insight is: if your code handles `username = 'vite'` (4 chars) correctly, it should also handle `username = 'vitest'` (6 chars) correctly — both are in the "valid" partition. You do not need to test every possible valid username length.

For a field with minimum 4 and maximum 20:

```
Partition 1: length < 4  (invalid — boundary at 4)
Partition 2: 4 <= length <= 20  (valid)
Partition 3: length > 20  (invalid — boundary at 20)
```

One representative test from each partition covers the main cases:

```
Partition 1: length 2  → 400
Partition 2: length 10 → 201 or 200
Partition 3: length 25 → 400
```

Combine equivalence partitioning (one test per partition) with boundary value analysis (three tests per boundary edge) for maximum coverage with minimum redundancy.

### Applying Equivalence Partitioning to Password Validation

The password must satisfy four character class requirements. These requirements create partitions:

| Partition | Description | Example | Expected |
|-----------|-------------|---------|---------|
| All four present | Meets all requirements | `Vitest@123456` | Valid |
| Missing uppercase | Has lower, digit, special, no upper | `vitest@123456` | Invalid |
| Missing lowercase | Has upper, digit, special, no lower | `VITEST@123456` | Invalid |
| Missing digit | Has upper, lower, special, no digit | `Vitest@abcdef` | Invalid |
| Missing special | Has upper, lower, digit, no special | `Vitest1234567` | Invalid |
| All missing | No requirements met | `abcdefghijklmn` | Invalid |

One test per partition covers the space without redundancy.

---

## 7. String Length Boundary Test Helper

Creating exact-length strings for tests can be error-prone. Here is a helper approach:

```typescript
// Create a string of exactly n characters using a given character
function str(char: string, length: number): string {
  return char.repeat(length);
}

// Usage in tests:
const username19 = `vitest${str('0', 13)}`;  // 'vitest' (6) + 13 zeros = 19 chars
const username20 = `vitest${str('0', 14)}`;  // 20 chars — at maximum
const username21 = `vitest${str('0', 15)}`;  // 21 chars — one above maximum

// Verify the lengths in your test (self-documenting)
expect(username19.length).toBe(19);
expect(username20.length).toBe(20);
expect(username21.length).toBe(21);
```

Verifying the length inside the test might feel like testing your test utility, but it is valuable: it prevents test bugs where you think you are testing the boundary but your string is actually the wrong length.

---

## 8. A Complete Boundary Test Suite

```typescript
import axios from 'axios';
import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://api.codeandtest.com/api/v1';
const opts = { validateStatus: () => true };

describe('Signup field boundaries', () => {
  // Shared valid fields — only the field under test changes
  const validBase = {
    password: 'Vitest@123456',
    avatarColor: '#4a90e2',
    avatarImage: 'https://res.cloudinary.com/example/image/upload/placeholder.jpg',
  };

  function uniqueUser(usernameOverride?: string) {
    const ts = Date.now();
    return {
      ...validBase,
      username: usernameOverride ?? `vitest${ts}`,
      email: `vitest${ts}@test.com`,
    };
  }

  // --- Username: minimum = 4 ---

  describe('username minimum boundary (4)', () => {
    it('3 chars — one below minimum', async () => {
      const res = await axios.post(`${BASE_URL}/signup`, {
        ...validBase,
        username: 'vit',
        email: `vit${Date.now()}@test.com`,
      }, opts);

      expect([400, 429]).toContain(res.status);
      if (res.status === 400) {
        expect(res.data.message).toBe('Username must be at least 4 characters');
      }
    });

    it('4 chars — exactly at minimum', async () => {
      const username = `v${Date.now()}`.slice(0, 4);
      const res = await axios.post(`${BASE_URL}/signup`, {
        ...validBase,
        username,
        email: `${username}@test.com`,
      }, opts);

      expect([201, 429]).toContain(res.status);
    });

    it('5 chars — one above minimum', async () => {
      const username = `vi${Date.now()}`.slice(0, 5);
      const res = await axios.post(`${BASE_URL}/signup`, {
        ...validBase,
        username,
        email: `${username}@test.com`,
      }, opts);

      expect([201, 429]).toContain(res.status);
    });
  });

  // --- Username: maximum = 20 ---

  describe('username maximum boundary (20)', () => {
    it('19 chars — one below maximum', async () => {
      const username = `vitest${Date.now()}`.slice(0, 19);
      expect(username.length).toBe(19);

      const res = await axios.post(`${BASE_URL}/signup`, {
        ...validBase,
        username,
        email: `${username}@test.com`,
      }, opts);

      expect([201, 429]).toContain(res.status);
    });

    it('20 chars — exactly at maximum', async () => {
      const username = `vitest${Date.now()}00`.slice(0, 20);
      expect(username.length).toBe(20);

      const res = await axios.post(`${BASE_URL}/signup`, {
        ...validBase,
        username,
        email: `${username}@test.com`,
      }, opts);

      expect([201, 429]).toContain(res.status);
    });

    it('21 chars — one above maximum', async () => {
      const username = `vitest${Date.now()}000`.slice(0, 21);
      expect(username.length).toBe(21);

      const res = await axios.post(`${BASE_URL}/signup`, {
        ...validBase,
        username,
        email: `${username}@test.com`,
      }, opts);

      expect([400, 429]).toContain(res.status);
      if (res.status === 400) {
        expect(res.data.message).toBe('Username cannot exceed 20 characters');
      }
    });
  });

  // --- Password: minimum = 12 ---

  describe('password minimum boundary (12)', () => {
    it('11 chars — one below minimum', async () => {
      const password = 'Vitest@1234';  // 11 chars
      expect(password.length).toBe(11);

      const res = await axios.post(`${BASE_URL}/signup`, {
        ...uniqueUser(),
        password,
      }, opts);

      expect([400, 429]).toContain(res.status);
      if (res.status === 400) {
        expect(res.data.message).toBe('Password must be at least 12 characters long');
      }
    });

    it('12 chars — exactly at minimum', async () => {
      const password = 'Vitest@12345';  // 12 chars
      expect(password.length).toBe(12);

      const res = await axios.post(`${BASE_URL}/signup`, {
        ...uniqueUser(),
        password,
      }, opts);

      expect([201, 429]).toContain(res.status);
    });

    it('13 chars — one above minimum', async () => {
      const password = 'Vitest@123456';  // 13 chars
      expect(password.length).toBe(13);

      const res = await axios.post(`${BASE_URL}/signup`, {
        ...uniqueUser(),
        password,
      }, opts);

      expect([201, 429]).toContain(res.status);
    });
  });
});
```

---

## 9. Boundary Tests for Signin (No Rate-Limit Concerns for Non-Auth Errors)

The signin validation happens before any database call. Validation errors (400) return quickly. Here the rate limiting is a concern, so always include 429 as an acceptable result.

```typescript
describe('Signin field validation boundaries', () => {
  const opts = { validateStatus: () => true };
  const validPassword = 'Vitest@123456';
  const validUsername = 'vitestmike';

  describe('username boundaries (min=4, max=32)', () => {
    it('3 chars → 400 Invalid username', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'abc',     // 3 — below min
        password: validPassword,
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });

    it('4 chars → passes format validation (may get 400 for wrong credentials)', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'abcd',    // 4 — at min
        password: validPassword,
      }, opts);

      // 400 because credentials are wrong, but not because of format
      // If it were format-rejected, the message would be 'Invalid username'
      if (res.status === 400) {
        expect(res.data.message).not.toBe('Invalid username');
      }
    });

    it('32 chars → passes format validation', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'a'.repeat(32),  // 32 — at max
        password: validPassword,
      }, opts);

      if (res.status === 400) {
        // Should not be rejected for format — should be credentials
        expect(res.data.message).not.toBe('Invalid username');
      }
    });

    it('33 chars → 400 Invalid username', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: 'a'.repeat(33),  // 33 — above max
        password: validPassword,
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid username');
    });
  });

  describe('password boundaries (min=8)', () => {
    it('7 chars → 400 Invalid password', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
        password: 'Short1!',  // 7 chars — below min
      }, opts);

      expect(res.status).toBe(400);
      expect(res.data.message).toBe('Invalid password');
    });

    it('8 chars → passes format validation', async () => {
      const res = await axios.post(`${BASE_URL}/signin`, {
        username: validUsername,
        password: 'Exactly8',  // 8 chars — at min
      }, opts);

      if (res.status === 400) {
        expect(res.data.message).not.toBe('Invalid password');
      }
    });
  });
});
```

---

## 10. Common Mistakes in Boundary Tests

| Mistake | Explanation | Fix |
|---------|-------------|-----|
| Only testing clearly invalid values (length 1) | Misses off-by-one bugs | Always test at n-1, n, and n+1 for each boundary |
| Not verifying string length in the test | Your helper might produce the wrong length | Add `expect(value.length).toBe(n)` before sending |
| Ignoring the `429` case | Rate-limited tests appear to fail randomly | Use `expect([400, 429]).toContain(res.status)` |
| Only testing the minimum, not the maximum | Maximum boundaries can also have bugs | Always test both ends |
| Testing one character class missing at a time but not all | Misses bugs where multiple requirements interact | Test each class missing independently |
| Not accounting for the server's title-casing on username | 4-char username becomes 4-char title-cased | The boundary is still 4 — title-casing doesn't change length |

---

## Related Topics

- [Negative Testing](negative-testing.md) — testing categories of invalid input
- [Positive Testing](positive-testing.md) — asserting on the valid side of boundaries
- [HTTP Status Codes](http-status-codes.md) — 400 and 429 in the context of boundary tests

## Official Documentation

- [Wikipedia — Boundary value analysis](https://en.wikipedia.org/wiki/Boundary-value_analysis)
- [ISTQB Glossary — Boundary value](https://glossary.istqb.org/en_US/term/boundary-value-analysis)
