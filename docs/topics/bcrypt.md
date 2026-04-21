# Bcrypt and Password Hashing

## Why Passwords Are Not Stored as Plain Text

When a user creates an account on Chatty, the password they typed — `Vitest@123456` — is never saved to the database. Instead, an irreversible transformation of that password is saved. This transformation is called a **hash**.

If the database is breached and an attacker obtains the stored values, they do not get working passwords. They get hashes that are computationally infeasible to reverse.

This is non-negotiable security practice. Any application that stores plain-text passwords is critically insecure.

---

## Hashing vs Encryption

These two terms are often confused. The difference is fundamental:

| | Hashing | Encryption |
|-|---------|-----------|
| Reversible? | No — one-way function | Yes — with the key |
| Purpose | Verify something without storing it | Protect data for later retrieval |
| Output determinism | Same input → same output (with same salt) | Same input + same key → same output |
| Use for passwords | Correct | Wrong — encrypted passwords can be decrypted if key is stolen |

A hash function takes arbitrary input and produces a fixed-length output. You cannot go from the output back to the input — there is no "decrypt" operation. You can only run the same function on a candidate password and compare the output.

---

## What bcrypt Is

Bcrypt is a password hashing function designed by Niels Provos and David Mazières in 1999. It has two properties that make it well-suited for passwords:

**1. It includes a salt automatically.**

A salt is a random value added to the password before hashing. Without salting, identical passwords would produce identical hashes, which allows precomputed "rainbow table" attacks. Bcrypt generates a random 128-bit salt for each password and stores it inside the hash string itself.

**2. It has a cost factor (work factor).**

The cost factor controls how many rounds of computation the hash function runs. Higher cost = more time to compute. As hardware gets faster, you increase the cost to keep brute-force attacks expensive. This is what "adaptive" means — the difficulty adapts to hardware over time.

---

## The $2b$ Prefix: Reading a Bcrypt Hash

A bcrypt hash stored in the Chatty database looks like this:

```
$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewkL4e3Pz9VTPYVW
```

This string encodes everything needed to verify a password:

| Segment | Example | Meaning |
|---------|---------|---------|
| Algorithm | `$2b$` | bcrypt version 2b (current standard) |
| Cost factor | `12` | 2^12 = 4,096 rounds of computation |
| Salt (22 chars) | `LQv3c1yqBWVHxkd0LHAkCO` | Random 128-bit salt, Base64-encoded |
| Hash (31 chars) | `Yz6TtxMQJqhN8/lewkL4e3Pz9VTPYVW` | The resulting hash of salt+password |

Total length: always **60 characters**.

The prefix variants you may see:

| Prefix | Meaning |
|--------|---------|
| `$2a$` | Original bcrypt — may have a Unicode handling bug in some implementations |
| `$2b$` | Fixed version — what modern Node.js implementations produce |
| `$2y$` | PHP's variant — compatible with `$2b$` |

Chatty uses Node.js `bcryptjs` or `bcrypt` (both produce `$2b$`).

---

## You Cannot Reverse a Bcrypt Hash

This is the most important point for test design.

Given the hash `$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewkL4e3Pz9VTPYVW`, there is no algorithm that recovers `Vitest@123456` from it. Brute-force is the only approach: try every possible password, hash each one, and compare. At cost factor 12, each attempt takes roughly 250ms — making systematic brute force infeasible.

**What this means for testing:**

You cannot test that a password was stored correctly by reading the hash and comparing to the original. The only way to verify a password is by calling the API's signin endpoint and seeing whether it returns 200.

---

## How Chatty Stores Passwords: Two-Document Architecture

When a user signs up, Chatty creates two MongoDB documents:

**Auth collection document:**

```json
{
  "_id": "ObjectId('661ab12345...')",
  "username": "Vitestmike",
  "email": "mike@example.com",
  "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewkL4e3Pz9VTPYVW",
  "avatarColor": "#4a90e2",
  "uId": "12345678",
  "createdAt": "2024-04-15T12:00:00.000Z"
}
```

**User collection document:**

```json
{
  "_id": "ObjectId('661ab99999...')",
  "authId": "661ab12345...",
  "username": "Vitestmike",
  "email": "mike@example.com",
  "profilePicture": "https://res.cloudinary.com/...",
  "postsCount": 0,
  "followersCount": 0,
  "followingCount": 0
}
```

The `User` collection does **not** have a `password` field. Passwords live only in `Auth`.

---

## What the Tests Can and Cannot Assert About Passwords

In Lecture 10, when you cross-validate the API against MongoDB, you can confirm the password was hashed correctly:

```typescript
it('DB password is hashed — not the plain-text password', () => {
  // The stored value must NOT equal the original password
  expect(dbAuthDoc?.password).not.toBe(TEST_PASSWORD);

  // Bcrypt hashes always start with $2
  expect((dbAuthDoc?.password as string).startsWith('$2')).toBe(true);
});
```

And you assert the API never returns the hash:

```typescript
it('API response does not include the password field', () => {
  expect(signInResponse.data.user).not.toHaveProperty('password');
});

it('GET /currentuser does not expose the password', () => {
  expect(currentUserResponse.data.user).not.toHaveProperty('password');
});
```

These two assertions together confirm:
- The DB stores a hash (not plain text)
- The API strips it before responding (not leaking data)

---

## The Rounds Parameter and Performance

When you call `bcrypt.hash(password, rounds)`, the `rounds` parameter (also called `saltRounds` or the cost factor) controls the work factor:

| Rounds | Approximate time (2024 hardware) | Use case |
|--------|----------------------------------|---------|
| 10 | ~100ms | Default for many apps |
| 12 | ~250ms | Chatty's setting |
| 14 | ~1000ms | High-security apps |
| 16 | ~4000ms | Overkill for most use cases |

The time penalty applies to both attackers and to your test suite. If your test signup 10 users sequentially, you will wait roughly 2.5 seconds just for password hashing at rounds=12. This is one reason test accounts should be created once and reused, not recreated for every test run.

---

## Bcrypt in Practice: Signup Flow

The Chatty signup controller does approximately this:

```typescript
// chatty-backend (simplified pseudocode, not actual file content)
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);

// Store in Auth collection
await AuthModel.create({
  username,
  email,
  password: hashedPassword,
  // ...other fields
});
```

On signin:

```typescript
// Retrieve the Auth document by username
const authUser = await AuthModel.findOne({ username });

// bcrypt.compare() hashes the candidate password and compares to the stored hash
const isMatch = await bcrypt.compare(candidatePassword, authUser.password);

if (!isMatch) {
  throw new Error('Invalid credentials');
}
```

`bcrypt.compare()` knows the salt because it is embedded in the stored hash string. It extracts the salt, hashes the candidate password with the same salt, and compares the results. If they match, the password is correct.

---

## Common Mistakes

| Mistake | Problem | Correct Approach |
|---------|---------|-----------------|
| Asserting `dbDoc.password === TEST_PASSWORD` | Will always fail — the DB stores a hash | Assert `not.toBe(TEST_PASSWORD)` and `startsWith('$2')` |
| Trying to decrypt the hash to verify it | Impossible — hashing is one-way | Call signin endpoint and assert 200 |
| Using `rounds = 1` in tests for speed | Insecure in production; confusing in tests | Let the API use its configured rounds — you are testing the API, not the hashing |
| Asserting the hash equals a known value | Will fail — the salt is random, so every hash of the same password is different | Assert the format (`$2b$12$...`) not the exact value |
| Exposing the hash in API responses | Security vulnerability — if the hash leaks, offline cracking is possible | Always assert `.not.toHaveProperty('password')` in response tests |

---

## Related Topics

- [MongoDB](mongodb.md)
- [JWT — JSON Web Tokens](jwt.md)
- [Cookies and Sessions](cookies-sessions.md)

## Official Documentation

- [bcrypt npm package](https://www.npmjs.com/package/bcrypt)
- [Wikipedia — bcrypt](https://en.wikipedia.org/wiki/Bcrypt)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
