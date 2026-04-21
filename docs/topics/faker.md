# Faker.js: Dynamic Test Data Generation

## Table of Contents

1. [What Faker.js Is and Why Dynamic Test Data Beats Hardcoded Strings](#1-what-fakerjs-is-and-why-dynamic-test-data-beats-hardcoded-strings)
2. [Installing Faker](#2-installing-faker)
3. [The faker Object Structure](#3-the-faker-object-structure)
4. [Every faker Method Used in This Course](#4-every-faker-method-used-in-this-course)
5. [Seeding for Reproducible Data](#5-seeding-for-reproducible-data)
6. [The vitest Username Prefix Requirement](#6-the-vitest-username-prefix-requirement)
7. [Generating Valid Test Credentials](#7-generating-valid-test-credentials)
8. [Faker and Test Isolation](#8-faker-and-test-isolation)
9. [Real Code Examples from Course Tests](#9-real-code-examples-from-course-tests)
10. [Common Mistakes](#10-common-mistakes)
11. [Related Topics](#related-topics)

---

## 1. What Faker.js Is and Why Dynamic Test Data Beats Hardcoded Strings

Faker.js is a library that generates random, realistic fake data: names, emails, sentences, UUIDs, phone numbers, and much more. It covers dozens of locales and data categories.

### The problem with hardcoded test data

Consider this test:

```typescript
// Hardcoded — this will fail the second time it runs
it('creates a new user', async () => {
  const response = await axios.post(`${BASE_URL}/auth/signup`, {
    username: 'testuser',          // already exists after the first run
    email: 'test@example.com',     // already taken
    password: 'Pass1234!',
    avatarColor: 'red',
    avatarImage: ''
  }, { validateStatus: () => true });

  expect(response.status).toBe(200); // fails with 400 "username already taken"
});
```

After the first test run, `testuser` exists in the database. The second run tries to create the same user, gets a 409 or 400, and the test fails — not because of a bug in the API, but because of a collision in test data.

### What Faker.js solves

```typescript
import { faker } from '@faker-js/faker';

it('creates a new user', async () => {
  const username = `vitest${faker.internet.username()}`.slice(0, 20);
  const email = faker.internet.email();

  const response = await axios.post(`${BASE_URL}/auth/signup`, {
    username,
    email,
    password: 'Pass1234!',
    avatarColor: 'red',
    avatarImage: ''
  }, { validateStatus: () => true });

  expect(response.status).toBe(200); // passes on every run — unique data each time
});
```

Every test run uses a different username and email. There are no collisions.

### Other benefits of dynamic data

| Hardcoded strings | Dynamic (Faker) |
|-------------------|-----------------|
| Fail on repeated runs (duplicate records) | Unique every run |
| Require manual cleanup before re-running | Self-contained via afterAll cleanup |
| Couple tests to specific data values | Tests the behavior, not specific values |
| Cannot reveal edge cases | Each run exercises slightly different data |
| Require careful coordination between test files | Each describe is independent |

---

## 2. Installing Faker

The modern Faker.js package is published under the `@faker-js/faker` scope (the community took over maintenance in 2022).

```bash
npm install --save-dev @faker-js/faker
```

### Importing

```typescript
// Named import — standard usage
import { faker } from '@faker-js/faker';

// Import with locale (for non-English data)
import { fakerDE as faker } from '@faker-js/faker';  // German locale
import { fakerJA as faker } from '@faker-js/faker';  // Japanese locale
```

For this course, the default (English) locale is used.

---

## 3. The faker Object Structure

`faker` is organized into modules by data category. Each module has methods that generate values in that category.

### Top-level modules

| Module | What it generates |
|--------|------------------|
| `faker.internet` | Usernames, emails, URLs, IP addresses, passwords, slugs |
| `faker.person` | First names, last names, full names, job titles, genders |
| `faker.string` | Random alphanumeric strings, UUIDs, hex strings |
| `faker.lorem` | Placeholder text: words, sentences, paragraphs |
| `faker.number` | Integers, floats within ranges |
| `faker.datatype` | Booleans, UUIDs (legacy — prefer `faker.string.uuid()`) |
| `faker.date` | Past, future, recent, between-range dates |
| `faker.location` | City, country, address, zip code |
| `faker.color` | Color names, hex values |
| `faker.word` | Single words in various grammatical forms |
| `faker.helpers` | Utilities: array element, shuffle, maybe, fake template |

### How each method call works

Every call to a faker method generates a *new* random value. Calling the same method twice gives two different values.

```typescript
faker.internet.username(); // e.g. 'BlueOtter92'
faker.internet.username(); // e.g. 'SilverFox47'   ← different value
```

---

## 4. Every faker Method Used in This Course

### faker.internet.username()

Generates a realistic-looking internet username (usually FirstnameLastnameNumber format).

```typescript
faker.internet.username();
// Examples: 'John_Doe', 'Alice.Smith42', 'BlueHero99', 'GreenTurtle_87'
```

**Note:** The generated username may contain dots, underscores, and mixed case. Since the Chatty API requires usernames to start with `vitest`, you always prefix and trim:

```typescript
const username = `vitest${faker.internet.username()}`.slice(0, 20);
// 'vitestBlueHero99' — safe, starts with vitest, within length limit
```

### faker.internet.email()

Generates a valid email address format.

```typescript
faker.internet.email();
// Examples: 'alice.smith@example.com', 'john.doe42@gmail.com', 'user_99@hotmail.com'
```

In tests:

```typescript
const email = faker.internet.email();
// e.g. 'FairOtter.Green42@test.com'
```

### faker.lorem.sentence()

Generates a random sentence of Lorem Ipsum-style text.

```typescript
faker.lorem.sentence();
// 'Consectetur adipiscing elit sed do eiusmod.'

faker.lorem.sentence(10);
// Generates a sentence of approximately 10 words

faker.lorem.sentences(3);
// Generates 3 sentences separated by spaces
```

In post creation tests:

```typescript
const response = await axios.post(`${BASE_URL}/posts`, {
  post: faker.lorem.sentence(),  // random post content
  bgColor: '#ffffff',
  privacy: 'Public',
  feelings: '',
  gifUrl: '',
  image: '',
  profilePicture: ''
}, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
```

### faker.lorem.word()

Generates a single random word.

```typescript
faker.lorem.word();
// 'lorem', 'ipsum', 'dolor', 'sit'
```

### faker.lorem.words(count)

Generates multiple words as a space-separated string.

```typescript
faker.lorem.words(3);
// 'consectetur adipiscing elit'
```

### faker.string.alphanumeric(length)

Generates a random alphanumeric string of the given length.

```typescript
faker.string.alphanumeric(8);
// 'aB3kR9mQ'

faker.string.alphanumeric(16);
// 'x7Kp2Nm9qR4tV8wZ'
```

Useful for generating unique identifiers or tokens in tests:

```typescript
const uniqueSuffix = faker.string.alphanumeric(6);
const username = `vitest${uniqueSuffix}`;
// 'vitest7kRm9q'
```

### faker.string.uuid()

Generates a UUID v4 string.

```typescript
faker.string.uuid();
// '550e8400-e29b-41d4-a716-446655440000'
```

Useful for generating mock IDs in test payloads:

```typescript
const fakePostId = faker.string.uuid();
```

### faker.person.firstName()

Generates a first name.

```typescript
faker.person.firstName();
// 'Alice', 'Bob', 'Carlos', 'Diana'
```

### faker.person.lastName()

Generates a last name.

```typescript
faker.person.lastName();
// 'Smith', 'Johnson', 'Garcia', 'Kim'
```

### faker.number.int(options)

Generates a random integer within a range.

```typescript
faker.number.int({ min: 1, max: 100 });
// e.g. 47

faker.number.int(10);
// e.g. 7 (0 to 10)
```

---

## 5. Seeding for Reproducible Data

By default, Faker uses a random seed, so each run produces different data. When you need *reproducible* data — for example, to recreate a failing test with the same values — you can set a seed.

### How seeding works

A seed is a number. The same seed always produces the same sequence of random values.

```typescript
import { faker } from '@faker-js/faker';

// Set a fixed seed
faker.seed(12345);

// These will ALWAYS produce the same values when seed is 12345
console.log(faker.internet.username()); // always the same value
console.log(faker.internet.email());    // always the same value
```

### Seeding a test suite for debugging

```typescript
describe('Reproducible test run', () => {
  beforeAll(() => {
    // Set seed at the start of the suite — all faker calls produce fixed data
    faker.seed(99999);
  });

  it('creates a user with predictable data', async () => {
    const username = `vitest${faker.internet.username()}`.slice(0, 20);
    // username is always the same for seed 99999 — you can reproduce the failure
    console.log('Username:', username);
    ...
  });
});
```

### When to use a seed

- Debugging a flaky test that fails only with certain generated values
- Recreating a reported bug that involved specific data
- Snapshot testing where you need stable expected values

### When NOT to use a seed permanently

Do not commit a permanent seed to your test files. Fixed data means the same username is used every run, which reintroduces the duplicate data problem.

---

## 6. The vitest Username Prefix Requirement

The Chatty API has a cleanup endpoint:

```
DELETE /api/v1/test/cleanup/user/:authId
Header: x-test-secret: <secret>
```

This endpoint deletes a user and all their data. To prevent accidental deletion of real users, the backend has a safety check:

> **The username of the user being deleted must start with `vitest`.**

If the username does not start with `vitest`, the cleanup endpoint returns an error.

### What happens without the prefix

```typescript
// WRONG — will fail cleanup
const username = faker.internet.username();
// e.g. 'BlueOtter92' — does not start with 'vitest'

// afterAll cleanup will fail:
await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, ...);
// Response: { error: 'User does not appear to be a test user' }
```

### The correct pattern

```typescript
// CORRECT — always prefix with 'vitest'
const username = `vitest${faker.internet.username()}`.slice(0, 20);
// e.g. 'vitestBlueOtter' — starts with 'vitest', within 20 char limit

// OR use alphanumeric for a cleaner result
const username = `vitest${faker.string.alphanumeric(8)}`;
// e.g. 'vitestxB3kR9mQ' — always safe, always unique
```

### Why the slice is sometimes needed

`faker.internet.username()` can return long strings. If the API enforces a maximum username length (common for social apps), prepending `vitest` might push you over the limit.

```typescript
// Safe pattern: prefix + 8 random characters = 14 characters total
const username = `vitest${faker.string.alphanumeric(8)}`;
// Always exactly 14 characters — predictable length

// Or: prefix + generated, capped at 20
const username = `vitest${faker.internet.username()}`.slice(0, 20);
```

---

## 7. Generating Valid Test Credentials

The Chatty API has password requirements. When generating test passwords, use a fixed format that always satisfies these requirements:

```typescript
// Option 1: Fixed password (always valid, simplest approach)
const password = 'Test1234!';

// Option 2: Generated but guaranteed to meet requirements
// Chatty requires: uppercase, lowercase, number, minimum 8 characters
const generatePassword = (): string => {
  const upper = faker.string.alpha({ length: 2, casing: 'upper' });
  const lower = faker.string.alpha({ length: 4, casing: 'lower' });
  const number = faker.number.int({ min: 10, max: 99 }).toString();
  const special = '!';
  return `${upper}${lower}${number}${special}`;
  // e.g. 'ABabcd42!'
};
```

### Complete credential generation helper

```typescript
// src/testHelpers.ts
import { faker } from '@faker-js/faker';

export interface TestCredentials {
  username: string;
  email: string;
  password: string;
  avatarColor: string;
  avatarImage: string;
}

export function generateTestCredentials(): TestCredentials {
  return {
    username: `vitest${faker.string.alphanumeric(8)}`,
    email: faker.internet.email(),
    password: 'Test1234!',  // fixed — always meets requirements
    avatarColor: faker.helpers.arrayElement(['red', 'blue', 'green', 'purple', 'orange']),
    avatarImage: ''
  };
}
```

Usage in tests:

```typescript
import { generateTestCredentials } from '../../src/testHelpers';

describe('User tests', () => {
  const credentials = generateTestCredentials();
  let token!: string;
  let authId!: string;

  beforeAll(async () => {
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, credentials,
      { validateStatus: () => true });
    expect(signupRes.status).toBe(200);

    const signinRes = await axios.post(`${BASE_URL}/auth/signin`,
      { username: credentials.username, password: credentials.password },
      { validateStatus: () => true });
    token = signinRes.data.token;
    authId = signinRes.data.user._id;
  });
});
```

---

## 8. Faker and Test Isolation

Test isolation means each test (or test suite) creates and cleans up its own data independently. Faker enables this by providing unique data for each run.

### The test lifecycle with Faker

```
1. [beforeAll] Generate unique credentials with faker
2. [beforeAll] Create the test user via signup
3. [beforeAll] Sign in to get token
4. [it/test]   Run tests using that token
5. [afterAll]  Delete the test user via cleanup endpoint
```

At the end of every test run, the test user and all their data are deleted. The next run starts fresh.

### Why this matters for test reliability

Without test isolation:
- Tests depend on the order they run
- One test's leftover data can cause another test to fail
- The database grows indefinitely with test data
- You cannot run the same test file multiple times without manual cleanup

With faker + cleanup:
- Each run is independent
- Tests can run in any order (within a file)
- The database stays clean
- You can run tests as many times as needed

### Describe-level isolation vs. test-level isolation

**Describe-level** (most common in this course): one test user per `describe` block.

```typescript
describe('Comments feature', () => {
  // One user for all tests in this describe block
  const { username, email, password, avatarColor, avatarImage } = generateTestCredentials();
  let token!: string;
  let authId!: string;

  beforeAll(async () => { /* create user, sign in */ });
  afterAll(async () => { /* cleanup user */ });

  it('test 1', async () => { /* uses token */ });
  it('test 2', async () => { /* uses token */ });
});
```

**Test-level** (for when each test needs a fresh user): one user per test.

```typescript
describe('User registration edge cases', () => {
  it('rejects duplicate username', async () => {
    const creds = generateTestCredentials();
    let authId: string | null = null;

    try {
      // First signup — succeeds
      const res1 = await axios.post(`${BASE_URL}/auth/signup`, creds,
        { validateStatus: () => true });
      expect(res1.status).toBe(200);
      authId = res1.data.user._id;

      // Second signup with same username — should fail
      const res2 = await axios.post(`${BASE_URL}/auth/signup`, creds,
        { validateStatus: () => true });
      expect(res2.status).toBe(400);
    } finally {
      // Always clean up, even if assertions fail
      if (authId) {
        await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`,
          { headers: { 'x-test-secret': process.env.TEST_SECRET }, validateStatus: () => true });
      }
    }
  });
});
```

---

## 9. Real Code Examples from Course Tests

### Example 1: Full test setup with faker-generated credentials

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { faker } from '@faker-js/faker';

const BASE_URL = process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1';

describe('POST /posts — create a post', () => {
  let token!: string;
  let authId!: string;

  const username = `vitest${faker.string.alphanumeric(8)}`;
  const email = faker.internet.email();
  const password = 'Test1234!';

  beforeAll(async () => {
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
      username,
      email,
      password,
      avatarColor: 'blue',
      avatarImage: ''
    }, { validateStatus: () => true });

    expect(signupRes.status).toBe(200);

    const signinRes = await axios.post(`${BASE_URL}/auth/signin`,
      { username, password },
      { validateStatus: () => true });

    expect(signinRes.status).toBe(200);
    token = signinRes.data.token;
    authId = signinRes.data.user._id;
  });

  afterAll(async () => {
    await axios.delete(
      `${BASE_URL}/test/cleanup/user/${authId}`,
      {
        headers: { 'x-test-secret': process.env.TEST_SECRET },
        validateStatus: () => true
      }
    );
  });

  it('creates a post with lorem sentence content', async () => {
    const postContent = faker.lorem.sentence();

    const response = await axios.post(
      `${BASE_URL}/posts`,
      {
        post: postContent,
        bgColor: '#ffffff',
        feelings: '',
        gifUrl: '',
        image: '',
        privacy: 'Public',
        profilePicture: ''
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: () => true
      }
    );

    expect(response.status).toBe(201);
    expect(response.data.message).toBe('Post created successfully');
  });

  it('generates different content each time', async () => {
    // Run 3 posts — each has unique content
    const posts = [
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence()
    ];

    // All three sentences are different
    expect(new Set(posts).size).toBe(3);
  });
});
```

### Example 2: Using faker.helpers for array selection

```typescript
import { faker } from '@faker-js/faker';

// helpers.arrayElement picks a random element from an array
const avatarColor = faker.helpers.arrayElement(['red', 'blue', 'green', 'purple', 'orange']);
const privacy = faker.helpers.arrayElement(['Public', 'Private']);
```

### Example 3: Generating a profile update payload

```typescript
function generateProfileUpdate() {
  return {
    quote: faker.lorem.sentence(),
    work: faker.person.jobTitle(),
    school: `${faker.location.city()} University`,
    location: `${faker.location.city()}, ${faker.location.country()}`,
    website: `https://${faker.internet.domainName()}`,
    instagram: faker.internet.username(),
    twitter: faker.internet.username(),
    facebook: faker.internet.username(),
    youtube: ''
  };
}

it('updates profile with realistic data', async () => {
  const profileData = generateProfileUpdate();

  const response = await axios.put(
    `${BASE_URL}/user/${userId}`,
    profileData,
    {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    }
  );

  expect(response.status).toBe(200);
});
```

---

## 10. Common Mistakes

### Mistake 1: Forgetting the vitest prefix

```typescript
// WRONG — cleanup will fail
const username = faker.internet.username();
// e.g. 'SilverFox99' — no 'vitest' prefix

// CORRECT
const username = `vitest${faker.string.alphanumeric(8)}`;
```

### Mistake 2: Generating credentials inside beforeAll instead of at describe scope

```typescript
// WRONG — credentials are regenerated on every beforeAll call,
// but they are not accessible outside beforeAll for assertions
describe('User tests', () => {
  let token!: string;

  beforeAll(async () => {
    const username = `vitest${faker.string.alphanumeric(8)}`; // only accessible inside beforeAll
    // ... sign up and sign in
    token = signinRes.data.token;
  });

  it('test 1', async () => {
    // Cannot access `username` here — it is scoped to beforeAll
  });
});

// CORRECT — declare at describe scope
describe('User tests', () => {
  let token!: string;
  const username = `vitest${faker.string.alphanumeric(8)}`; // accessible everywhere

  beforeAll(async () => {
    // uses `username` — accessible here too
  });

  it('test 1', async () => {
    // `username` is accessible here
  });
});
```

### Mistake 3: Using faker.seed() permanently in test files

```typescript
// WRONG — permanent seed means same username every run → duplicate user error
beforeAll(() => {
  faker.seed(12345);  // Do not leave this in production test code
});
```

Only use seeding temporarily for debugging. Remove it before committing.

### Mistake 4: Generating a new username in afterAll

```typescript
// WRONG — generates a DIFFERENT username than the one used to sign up
describe('User tests', () => {
  beforeAll(async () => {
    const username = `vitest${faker.string.alphanumeric(8)}`;
    await signup(username);
    authId = (await signin(username)).data.user._id;
  });

  afterAll(async () => {
    // This username is different from the one created above!
    const username = `vitest${faker.string.alphanumeric(8)}`; // NEW random value
    // Cleanup will fail — authId belongs to a different user
  });
});

// CORRECT — declare username at describe scope and reuse it
describe('User tests', () => {
  const username = `vitest${faker.string.alphanumeric(8)}`;  // one value, used everywhere
  let authId!: string;

  beforeAll(async () => {
    await signup(username);
    authId = (await signin(username)).data.user._id;
  });

  afterAll(async () => {
    await cleanup(authId);  // authId is the correct user
  });
});
```

---

## Related Topics

- [Environment Variables](environment-variables.md) — `TEST_SECRET` used in cleanup after faker-generated users
- [Vitest](vitest.md) — `beforeAll`/`afterAll` lifecycle where faker is typically called
- [Async/Await](async-await.md) — Faker calls are synchronous, but signup/signin/cleanup are async
- [Axios](axios.md) — Faker data is passed as the request body in `axios.post()` calls
- [TypeScript Basics](typescript-basics.md) — Typing the credential objects returned by faker-based helpers

## Official Documentation

- [Faker.js — Official docs](https://fakerjs.dev/)
- [Faker.js — API reference](https://fakerjs.dev/api/)
- [Faker.js GitHub](https://github.com/faker-js/faker)
