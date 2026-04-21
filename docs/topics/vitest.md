# Vitest: Test Runner for the Chatty API Course

## Table of Contents

1. [What Vitest Is and Why Use It Over Jest](#1-what-vitest-is-and-why-use-it-over-jest)
2. [Installing and Configuring Vitest](#2-installing-and-configuring-vitest)
3. [vitest.config.ts Options Used in This Course](#3-vitestconfigts-options-used-in-this-course)
4. [Test Structure: describe, it, test](#4-test-structure-describe-it-test)
5. [The Full Matcher Reference](#5-the-full-matcher-reference)
6. [beforeAll, afterAll, beforeEach, afterEach](#6-beforeall-afterall-beforeeach-aftereach)
7. [Running Specific Files and Options](#7-running-specific-files-and-options)
8. [globals: true — What It Means](#8-globals-true--what-it-means)
9. [Code Examples with Every Matcher](#9-code-examples-with-every-matcher)
10. [Common Vitest Patterns in This Course](#10-common-vitest-patterns-in-this-course)
11. [Related Topics](#related-topics)

---

## 1. What Vitest Is and Why Use It Over Jest

Vitest is a test runner built on top of Vite. It runs in Node.js and is designed for modern TypeScript and ESM codebases.

### Why Vitest instead of Jest in this course

| Feature | Vitest | Jest |
|---------|--------|------|
| TypeScript support | Native — no Babel or `ts-jest` needed | Requires `ts-jest` or `babel-jest` configuration |
| ESM support | Native | Requires complex configuration |
| Speed | Very fast — Vite's transform pipeline | Slower startup and transform |
| Config | Single `vitest.config.ts` — Vite-compatible | Separate `jest.config.js` with different API |
| `.env` loading | Automatic via Vite | Requires `dotenv` setup in config |
| Watch mode | Fast HMR-aware reruns | Slower full re-runs |
| API compatibility | Jest-compatible API — same `describe/it/expect` | Jest API |

For this course, Vitest provides a zero-friction setup with TypeScript. You do not need Babel, `ts-jest`, or `@types/jest`.

### What Vitest is NOT

- Vitest is not an HTTP client — it does not make API calls (Axios does)
- Vitest is not a mocking library (though it has mocking utilities)
- Vitest is not a CI system — it runs locally and in CI but does not manage pipelines

---

## 2. Installing and Configuring Vitest

### Installation

```bash
npm install --save-dev vitest
```

### package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

- `vitest run` — runs all tests once and exits (for CI and `npm test`)
- `vitest` — starts watch mode; reruns tests on file changes
- `vitest --ui` — opens a browser UI showing test results

### Project structure

```
chatty-api-tests/
  tests/
    lecture-01/
      lecture.test.ts
      homework/
        starter.test.ts
        solution.test.ts
    lecture-02/
      lecture.test.ts
      homework/
        starter.test.ts
        solution.test.ts
  src/
    config.ts
    apiClient.ts
  vitest.config.ts
  tsconfig.json
  .env
  .env.example
  package.json
```

---

## 3. vitest.config.ts Options Used in This Course

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,            // makes describe/it/expect available without importing
    environment: 'node',      // use Node.js environment (not jsdom)
    testTimeout: 30000,       // 30 seconds per test — API calls can be slow
    fileParallelism: false,   // run test files sequentially — prevents state conflicts
    reporters: ['verbose'],   // show each test name, not just the summary
    include: ['tests/**/*.test.ts'],  // only pick up files matching this glob
  }
});
```

### Options explained

| Option | Value | Why |
|--------|-------|-----|
| `globals` | `true` | Avoids importing `describe`, `it`, `expect` in every file. Requires `"types": ["vitest/globals"]` in tsconfig |
| `environment` | `'node'` | Tests run in Node.js, not a browser simulation — correct for API testing |
| `testTimeout` | `30000` | Real HTTP requests over a network can take several seconds. Default of 5000ms is too short |
| `fileParallelism` | `false` | Prevents two test files from running concurrently, which could cause conflicts if both create the same test user |
| `reporters` | `['verbose']` | Shows individual test names as they run — easier to see which test failed |

### Additional useful options

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
    reporters: ['verbose'],

    // Run setup code before each test file
    setupFiles: ['./tests/setup.ts'],

    // Automatically retry flaky tests up to 2 times
    retry: 2,

    // Stop after first failure (good for debugging)
    // bail: 1,

    // Coverage (optional — requires @vitest/coverage-v8)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
    }
  }
});
```

---

## 4. Test Structure: describe, it, test

Vitest uses the same vocabulary as Jest and Jasmine.

### describe

`describe` groups related tests. You can nest `describe` blocks to create a hierarchy.

```typescript
describe('Auth endpoints', () => {
  describe('POST /auth/signup', () => {
    it('creates a new user with valid data', async () => { ... });
    it('returns 400 with duplicate username', async () => { ... });
    it('returns 400 when password is too short', async () => { ... });
  });

  describe('POST /auth/signin', () => {
    it('returns token with valid credentials', async () => { ... });
    it('returns 400 with wrong password', async () => { ... });
  });
});
```

### it and test

`it` and `test` are identical. `it` reads more naturally in BDD style: "it should do X". `test` is more explicit: "test that X happens".

```typescript
// These are equivalent
it('returns 200 for a valid request', async () => { ... });
test('returns 200 for a valid request', async () => { ... });
```

### Test naming conventions

```typescript
// Good test names describe the expected behavior
it('returns 201 when all required fields are provided')
it('returns 400 when username is already taken')
it('returns 401 when Authorization header is missing')
it('returns an array of posts with correct shape')
it('creates a post and it appears in the feed')

// Avoid vague names
it('works correctly')      // What works? What does correctly mean?
it('test signup')          // Not a sentence; does not describe behavior
```

### Skipping and isolating tests

```typescript
// Skip a test (runs the rest of the suite)
it.skip('this test is broken and being fixed', async () => { ... });

// Run only this test (useful for debugging a specific case)
it.only('debug this one test', async () => { ... });

// Skip a describe block
describe.skip('feature not yet implemented', () => { ... });

// Run only this describe block
describe.only('auth endpoints', () => { ... });
```

---

## 5. The Full Matcher Reference

Matchers go inside `expect(value).matcher()`. All matchers can be negated with `.not`.

### toBe

Strict equality using `Object.is`. Use for primitives (numbers, strings, booleans).

```typescript
expect(response.status).toBe(200);
expect(response.data.message).toBe('Post created successfully');
expect(response.data.success).toBe(true);
// Do NOT use toBe for objects — it checks reference equality, not value equality
```

### toEqual

Deep equality. Use for objects and arrays.

```typescript
expect(response.data.user).toEqual({
  _id: authId,
  username: 'vitestUser123',
  email: 'test@example.com'
});

expect(response.data.reactions).toEqual({ like: 0, love: 0, wow: 0 });
```

### toMatchObject

Checks that the received object contains the *subset* of properties in the expected object. Extra properties in the received object are allowed.

```typescript
// The post object may have many fields — we only check the ones we care about
expect(response.data.post).toMatchObject({
  post: 'Hello world',
  privacy: 'Public',
  username: 'vitestUser123'
});
// If response.data.post also has createdAt, _id, etc., the assertion still passes
```

### toBeDefined

Checks that the value is not `undefined`.

```typescript
expect(response.data.token).toBeDefined();
expect(response.data.user._id).toBeDefined();
expect(response.headers['content-type']).toBeDefined();
```

### toBeUndefined

Checks that the value IS `undefined`.

```typescript
expect(response.data.deletedPost).toBeUndefined();
```

### toBeNull

Checks that the value is exactly `null`.

```typescript
expect(response.data.profilePicture).toBeNull();
```

### toBeGreaterThan / toBeGreaterThanOrEqual

Numeric comparison.

```typescript
expect(response.data.totalPosts).toBeGreaterThan(0);
expect(response.data.posts.length).toBeGreaterThanOrEqual(1);
expect(response.status).toBeGreaterThanOrEqual(200);
expect(response.status).toBeLessThan(300);
```

### toContain

Checks that a string contains a substring, or an array contains an item.

```typescript
// String contains
expect(response.data.message).toContain('successfully');
expect(response.headers['content-type']).toContain('application/json');

// Array contains
expect(response.data.tags).toContain('vitest');
```

### toHaveLength

Checks the `.length` property.

```typescript
expect(response.data.posts).toHaveLength(10);
expect(response.data.token.length).toBeGreaterThan(20);
```

### toHaveProperty

Checks that an object has a property at a given path.

```typescript
expect(response.data).toHaveProperty('token');
expect(response.data).toHaveProperty('user._id');         // nested path
expect(response.data).toHaveProperty('user.username', 'vitestUser'); // with value check
```

### not.toHaveProperty

Checks that an object does NOT have a property.

```typescript
// Password should never appear in an API response
expect(response.data.user).not.toHaveProperty('password');
expect(response.data.user).not.toHaveProperty('passwordHash');
```

### toBeInstanceOf

Checks that the value is an instance of a class.

```typescript
expect(new Date(response.data.createdAt)).toBeInstanceOf(Date);
```

### toBeTruthy / toBeFalsy

Checks for truthy/falsy values (like an `if` condition).

```typescript
expect(response.data.token).toBeTruthy();  // non-empty string is truthy
expect(response.data.posts.length).toBeTruthy(); // > 0 is truthy
```

### toThrow

Checks that a function throws.

```typescript
expect(() => {
  requireEnv('MISSING_VAR');
}).toThrow('Required environment variable');
```

---

## 6. beforeAll, afterAll, beforeEach, afterEach

Lifecycle hooks run setup and teardown code around your tests.

### When each hook runs

```
describe('My suite')
  ↓
beforeAll   — runs ONCE before the first test in this describe
  ↓
beforeEach  — runs before EACH test
  ↓
it/test     — the actual test
  ↓
afterEach   — runs after EACH test
  ↓
afterAll    — runs ONCE after the last test in this describe
```

### beforeAll — set up shared state once

```typescript
describe('Post endpoints', () => {
  let token!: string;
  let authId!: string;

  beforeAll(async () => {
    // This runs once — we sign in once and reuse the token in all tests
    const signinRes = await axios.post(
      `${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true }
    );
    expect(signinRes.status).toBe(200);
    token = signinRes.data.token;
    authId = signinRes.data.user._id;
  });

  it('first test — uses token', async () => { ... });
  it('second test — also uses token', async () => { ... });
});
```

### afterAll — clean up after tests finish

```typescript
afterAll(async () => {
  // Runs once after all tests in this describe have finished
  await axios.delete(
    `${BASE_URL}/test/cleanup/user/${authId}`,
    {
      headers: { 'x-test-secret': process.env.TEST_SECRET },
      validateStatus: () => true
    }
  );
});
```

### beforeEach — set up fresh state for each test

```typescript
describe('Post creation', () => {
  let freshPostId!: string;

  beforeEach(async () => {
    // Create a fresh post before each test so each test has its own resource
    const createRes = await axios.post(
      `${BASE_URL}/posts`,
      { post: faker.lorem.sentence(), bgColor: '#fff', privacy: 'Public',
        feelings: '', gifUrl: '', image: '', profilePicture: '' },
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
    freshPostId = createRes.data._id;
  });

  afterEach(async () => {
    // Delete the post created in beforeEach
    await axios.delete(
      `${BASE_URL}/posts/${freshPostId}`,
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
  });

  it('can react to the post', async () => {
    const response = await axios.post(
      `${BASE_URL}/reactions`,
      { postId: freshPostId, type: 'like', postReactions: { like: 0 } },
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
    );
    expect(response.status).toBe(200);
  });
});
```

### afterEach — clean up after each test

Use `afterEach` for cleanup that must run after every single test, such as deleting data created during the test itself (not in `beforeEach`).

### Scope and nesting

Hooks are scoped to their `describe` block and affect only the tests within that block. Nested `describe` blocks get both the outer and inner hooks:

```typescript
describe('Outer', () => {
  beforeAll(() => console.log('Outer beforeAll'));
  afterAll(() => console.log('Outer afterAll'));

  describe('Inner', () => {
    beforeAll(() => console.log('Inner beforeAll'));
    afterAll(() => console.log('Inner afterAll'));

    it('test', () => { ... });
    // Order: Outer beforeAll → Inner beforeAll → test → Inner afterAll → Outer afterAll
  });
});
```

---

## 7. Running Specific Files and Options

### Run all tests

```bash
npm test
# or
npx vitest run
```

### Run a specific file

```bash
npx vitest run tests/lecture-01/lecture.test.ts
```

### Run files matching a pattern

```bash
# All lecture files
npx vitest run tests/lecture-*/lecture.test.ts

# All homework solution files
npx vitest run tests/**/homework/solution.test.ts

# Files matching a string
npx vitest run lecture-03
```

### Run a specific test by name

```bash
# Run tests whose name matches the pattern
npx vitest run -t "returns 401"

# Run tests in a specific file AND matching a name
npx vitest run tests/lecture-02/lecture.test.ts -t "POST /auth"
```

### Watch mode

```bash
npx vitest
# Vitest starts in watch mode — reruns related tests on file save
# Press 'a' to run all tests, 'f' to run only failed tests, 'q' to quit
```

### The --reporter flag

```bash
# Verbose: shows each individual test name
npx vitest run --reporter=verbose

# Dot: one dot per test (compact — good for large suites)
npx vitest run --reporter=dot

# JSON: machine-readable output (for CI integration)
npx vitest run --reporter=json --outputFile=results.json

# HTML: generates an HTML report file
npx vitest run --reporter=html
```

### Other useful flags

```bash
# Set a custom timeout (in milliseconds)
npx vitest run --testTimeout=60000

# Show console.log output (suppressed by default in verbose mode)
npx vitest run --reporter=verbose --no-silent

# Run with a specific config file
npx vitest run --config vitest.config.ts

# Type-check while running
npx vitest run --typecheck
```

---

## 8. globals: true — What It Means

When `globals: true` is set in `vitest.config.ts`, Vitest makes the following functions available globally without importing them:

```typescript
// When globals: true, you do NOT need this import in every test file
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
```

Instead, they are available directly:

```typescript
// With globals: true — this works without any import at the top
describe('My tests', () => {
  it('runs without imports', async () => {
    expect(1 + 1).toBe(2);
  });
});
```

### TypeScript requirement

For TypeScript to recognize these globals, you must add `"vitest/globals"` to the `types` array in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

Without this, TypeScript will report: "Cannot find name 'describe'" even though the tests run correctly.

### When to still use explicit imports

If you need `vi` (Vitest's mock utility) for advanced mocking, it is clearer to import it explicitly even with `globals: true`:

```typescript
import { vi } from 'vitest';  // explicit import for clarity

// vi.fn(), vi.mock(), vi.spyOn(), etc.
const mockFn = vi.fn();
```

---

## 9. Code Examples with Every Matcher

All examples use real Chatty API response shapes.

```typescript
import axios from 'axios';

const BASE_URL = process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1';

describe('Matcher reference examples', () => {
  let token!: string;

  beforeAll(async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });
    token = res.data.token;
  });

  it('toBe — exact primitive equality', async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });

    expect(res.status).toBe(200);
    expect(typeof res.data.token).toBe('string');
    expect(res.data.user.username).toBe(process.env.TEST_USERNAME);
  });

  it('toEqual — deep object equality', async () => {
    const res = await axios.get(`${BASE_URL}/posts/all/0`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

    // Check exact structure of a specific object
    const firstPost = res.data.posts[0];
    expect(firstPost).toEqual(
      expect.objectContaining({ post: expect.any(String) })
    );
  });

  it('toMatchObject — partial object match', async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });

    // We only care that these fields exist with correct values
    // Other fields in res.data.user are ignored
    expect(res.data.user).toMatchObject({
      username: process.env.TEST_USERNAME,
      email: expect.any(String)
    });
  });

  it('toBeDefined — field exists', async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });

    expect(res.data.token).toBeDefined();
    expect(res.data.user._id).toBeDefined();
    expect(res.data.user.avatarColor).toBeDefined();
  });

  it('toContain — string or array contains', async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });

    // String contains substring
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('toHaveProperty — object has a path', async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });

    expect(res.data).toHaveProperty('token');
    expect(res.data).toHaveProperty('user');
    expect(res.data).toHaveProperty('user._id');
  });

  it('not.toHaveProperty — field must not exist', async () => {
    const res = await axios.post(`${BASE_URL}/auth/signin`,
      { username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD },
      { validateStatus: () => true });

    // Sensitive fields must never appear in API responses
    expect(res.data.user).not.toHaveProperty('password');
    expect(res.data.user).not.toHaveProperty('passwordHash');
  });

  it('toBeGreaterThan — numeric comparison', async () => {
    const res = await axios.get(`${BASE_URL}/posts/all/0`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

    expect(res.data.totalPosts).toBeGreaterThan(0);
    expect(res.data.posts.length).toBeGreaterThan(0);
  });

  it('not.toBe — negative assertion on status', async () => {
    const res = await axios.get(`${BASE_URL}/posts/all/0`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });
});
```

---

## 10. Common Vitest Patterns in This Course

### Pattern: One beforeAll per describe, one afterAll per describe

```typescript
describe('Feature X tests', () => {
  // Declared at describe scope — accessible in all hooks and tests
  let token!: string;
  let authId!: string;
  const username = `vitest${faker.internet.username()}`.slice(0, 20);

  beforeAll(async () => {
    // Signup + signin
    await axios.post(`${BASE_URL}/auth/signup`, { username, ... }, { validateStatus: () => true });
    const res = await axios.post(`${BASE_URL}/auth/signin`, { username, ... }, { validateStatus: () => true });
    token = res.data.token;
    authId = res.data.user._id;
  });

  afterAll(async () => {
    // Clean up the test user
    await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`,
      { headers: { 'x-test-secret': process.env.TEST_SECRET }, validateStatus: () => true });
  });

  it('test 1', async () => { /* uses token */ });
  it('test 2', async () => { /* uses token */ });
  it('test 3', async () => { /* uses token */ });
});
```

### Pattern: Sequential dependent tests

When test B depends on data created in test A, declare shared variables at the `describe` scope:

```typescript
describe('Post lifecycle', () => {
  let postId!: string;  // assigned by "create" test, used by "delete" test

  it('creates a post', async () => {
    const res = await axios.post(`${BASE_URL}/posts`, postBody,
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
    expect(res.status).toBe(201);
    postId = res.data._id;  // assign for later test
  });

  it('fetches the created post', async () => {
    const res = await axios.get(`${BASE_URL}/posts/${postId}`,
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
    expect(res.status).toBe(200);
    expect(res.data.post._id).toBe(postId);
  });

  it('deletes the post', async () => {
    const res = await axios.delete(`${BASE_URL}/posts/${postId}`,
      { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
    expect(res.status).toBe(200);
  });
});
```

Note: `fileParallelism: false` in `vitest.config.ts` ensures tests within a file run in order.

---

## Related Topics

- [Async/Await](async-await.md) — How Vitest handles async test callbacks; the `.then()` return requirement
- [Axios](axios.md) — The HTTP client used inside every `it` block
- [TypeScript Basics](typescript-basics.md) — `globals: true` + `"types": ["vitest/globals"]` to avoid import boilerplate
- [Environment Variables](environment-variables.md) — How `vitest.config.ts` auto-loads `.env`; `process.env` in test files
- [Faker](faker.md) — Dynamic test data used inside `beforeAll` and test bodies

## Official Documentation

- [Vitest — Official docs](https://vitest.dev/)
- [Vitest — API reference](https://vitest.dev/api/)
- [Vitest — Configuration](https://vitest.dev/config/)
- [Vitest — Coverage](https://vitest.dev/guide/coverage.html)
- [Vitest GitHub](https://github.com/vitest-dev/vitest)
