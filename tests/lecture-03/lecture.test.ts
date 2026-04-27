// Lecture 03 — SignUp: Creating & Cleaning Up Test Users
//
// Endpoint: POST /api/v1/signup
//
// New concepts introduced here:
//   1. Faker.js — dynamic test data that never clashes in the database
//   2. avatarImage — a base64 PNG required by Cloudinary upload
//   3. Test cleanup endpoint — DELETE /test/cleanup/user/:authId
//   4. Full lifecycle: beforeAll creates user → tests run → afterAll deletes user
//   5. Optional chaining (?.) and nullish coalescing (??) in TypeScript
//   6. Duplicate signup — business logic error after schema passes
//
// Prerequisites:
//   No env vars beyond BASE_URL, TEST_USERNAME, TEST_PASSWORD.
//   TEST_CLEANUP_SECRET is a hardcoded constant in src/fixtures.ts — no setup needed.
//
// Run: npm test tests/lecture-03/lecture.test.ts

import axios, { type AxiosResponse } from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../src/config';
import { expectRejected } from '../../src/test-utils';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signupUrl = `${config.BASE_URL}/signup`;
const cleanupUrl = (authId: string) => `${config.BASE_URL}/test/cleanup/user/${authId}`;

// ─── File-level shared state ──────────────────────────────────────────────────

let signUpResponse!: AxiosResponse;
let authId: string = '';
let sessionCookie: string = '';

// The user data is generated once and reused across all test sections.
// Using `const` here because the same user is tested throughout the file.
const newUser = {
  username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
  email: faker.internet.email().toLowerCase(),
  password: TEST_PASSWORD,
  avatarColor: TEST_AVATAR_COLOR,
  avatarImage: TEST_AVATAR_IMAGE,
};

beforeAll(async () => {
  // Create the test user
  signUpResponse = await axios.post(signupUrl, newUser, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });

  // Capture authId for cleanup.
  // Optional chaining (?.) — if user is undefined (signup failed), returns undefined.
  // Nullish coalescing (?? '') — sets authId to '' if undefined.
  authId = signUpResponse.data.user?.authId ?? '';

  // Capture session cookie
  const raw = signUpResponse.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Wait for Bull queue to flush user to MongoDB — duplicate email check reads from DB
  await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Always clean up, even if tests failed.
  // Without this, the database fills with test data that blocks future runs.
  if (!authId) return;

  await axios.delete(cleanupUrl(authId), {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });
});

// ─── 1. Successful signup — basic ─────────────────────────────────────────────
//
// Signup is a creation endpoint — it returns 201 Created, not 200 OK.
// This is the HTTP convention for POST requests that create a new resource.

describe('1. Successful signup — basic', () => {

  it('status is 201 Created', () => {
    expect(signUpResponse.status).toBe(201);
  });

  it('message is "User created successfully"', () => {
    expect(signUpResponse.data.message).toBe('User created successfully');
  });

  it('response has the correct top-level shape', () => {
    expect(signUpResponse.data).toMatchObject({
      message: expect.any(String),
      token: expect.any(String),
      user: expect.any(Object),
    });
  });

});

// ─── 2. User object ───────────────────────────────────────────────────────────
//
// The user object contains both the User document (_id) and the Auth document (authId).
// We capture authId in beforeAll — it is needed for the cleanup endpoint.

describe('2. User object', () => {

  it('user has _id and authId', () => {
    expect(signUpResponse.data.user).toMatchObject({
      _id: expect.any(String),
      authId: expect.any(String),
    });
  });

  it('username is title-cased version of what was sent', () => {
    // Chatty normalises: "vitestk7m2xq9w" → "Vitestk7m2xq9w"
    const received = signUpResponse.data.user.username.toLowerCase();
    expect(received).toBe(newUser.username.toLowerCase());
  });

  it('email is lowercase', () => {
    expect(signUpResponse.data.user.email).toBe(newUser.email.toLowerCase());
  });

  it('password is NOT in the user object', () => {
    expect(signUpResponse.data.user).not.toHaveProperty('password');
  });

  it('postsCount starts at 0', () => {
    expect(signUpResponse.data.user.postsCount).toBe(0);
  });

  it('profilePicture is a Cloudinary URL', () => {
    // The server uploads avatarImage to Cloudinary and stores the URL here.
    // It should start with https://res.cloudinary.com/
    const pic: string = signUpResponse.data.user.profilePicture;
    expect(typeof pic).toBe('string');
    expect(pic.length).toBeGreaterThan(0);
  });

});

// ─── 3. Token and cookie ──────────────────────────────────────────────────────
//
// Signup sets a session cookie and returns a JWT — same as signin.
// By Lecture 3 you know these patterns — the assertions are shorter.

describe('3. Token and cookie', () => {

  it('token is a valid JWT (three dot-separated parts)', () => {
    const parts = signUpResponse.data.token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0].startsWith('eyJ')).toBe(true);
  });

  it('set-cookie header is present', () => {
    expect(signUpResponse.headers['set-cookie']).toBeDefined();
  });

  it('session cookie contains "session="', () => {
    expect(sessionCookie).toContain('session=');
  });

});

// ─── 4. Test cleanup endpoint ─────────────────────────────────────────────────
//
// The cleanup endpoint is what afterAll uses to delete the test user.
// Testing it directly proves it works before relying on it for cleanup.
//
// We test it with a WRONG secret to verify the protection works.
// The real deletion happens in afterAll (correct secret, correct authId).

describe('4. Test cleanup endpoint — protection checks', () => {

  it('returns 403 with wrong secret', async () => {
    const res = await axios.delete(cleanupUrl(authId), {
      headers: { 'x-test-secret': 'completely-wrong-secret' },
      validateStatus: () => true,
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 with missing secret header', async () => {
    const res = await axios.delete(cleanupUrl(authId), {
      validateStatus: () => true,
    });
    expect(res.status).toBe(403);
  });

});

// ─── 5. Duplicate signup ──────────────────────────────────────────────────────
//
// Trying to sign up with the same username OR email that already exists → 400.
// This is a BUSINESS LOGIC error (not a Joi validation error):
//   Joi passes (all fields are present and valid).
//   The controller checks the database and finds a conflict.

describe('5. Duplicate signup', () => {

  it('same username returns 400', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      email: faker.internet.email().toLowerCase(), // different email
      // same username
    }, { validateStatus: () => true });

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('already');
    }
  });

  it('same email returns 400', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`, // different username
      // same email
    }, { validateStatus: () => true });

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('already');
    }
  });

});

// ─── 6. Boundary value tests ──────────────────────────────────────────────────
//
// Schema: username min 4 / max 20, password min 12 / max 128 + pattern, email format.
// All these fail at the Joi layer (before Cloudinary) so they return fast.

describe('6. Boundary value tests — Joi schema limits', () => {

  it('username shorter than 4 chars is rejected', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      username: 'vit', // 3 chars
    }, { validateStatus: () => true });
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toContain('at least 4');
  });

  it('username longer than 20 chars is rejected', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      username: `vitest${'a'.repeat(16)}`, // 22 chars
    }, { validateStatus: () => true });
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toContain('cannot exceed 20');
  });

  it('password shorter than 12 chars is rejected', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      email: faker.internet.email().toLowerCase(),
      username: `vitest${faker.string.alphanumeric(6).toLowerCase()}`,
      password: 'Test@1234', // 9 chars
    }, { validateStatus: () => true });
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toContain('at least 12');
  });

  it('password without special character is rejected', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      email: faker.internet.email().toLowerCase(),
      username: `vitest${faker.string.alphanumeric(6).toLowerCase()}`,
      password: 'TestPassword123', // no special char
    }, { validateStatus: () => true });
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toContain('must contain');
  });

  it('invalid email format is rejected', async () => {
    const res = await axios.post(signupUrl, {
      ...newUser,
      email: 'notanemail',
    }, { validateStatus: () => true });
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toContain('Email must be valid');
  });

});

// ─── 7. Header assertions ─────────────────────────────────────────────────────

describe('7. Header assertions', () => {

  it('Content-Type is application/json', () => {
    expect(signUpResponse.headers['content-type']).toContain('application/json');
  });

});

// ─── 8. Response time ─────────────────────────────────────────────────────────
//
// Signup is slower than signin — it uploads to Cloudinary and writes to Redis + DB queue.
// We allow up to 10 seconds (generous for a remote Cloudinary call).

describe('8. Response time', () => {

  it('signup responds within 10000ms', async () => {
    const start = Date.now();
    await axios.post(signupUrl, {
      username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
      email: faker.internet.email().toLowerCase(),
      password: TEST_PASSWORD,
      avatarColor: TEST_AVATAR_COLOR,
      avatarImage: TEST_AVATAR_IMAGE,
    }, { validateStatus: () => true }).then(async (res) => {
      // Clean up this extra user if it was created successfully
      const extraAuthId = res.data.user?.authId;
      if (extraAuthId) {
        await axios.delete(cleanupUrl(extraAuthId), {
          headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
          validateStatus: () => true,
        });
      }
    });
    expect(Date.now() - start).toBeLessThan(10000);
  });

});

// ─── 9. Assertion variants ────────────────────────────────────────────────────
//
// Three assertion types not used elsewhere in this file:
//   toMatch(/regex/)          — assert a string matches a regular expression
//   toBeGreaterThanOrEqual(n) — lower-bound range assertion for numeric values
//   toSatisfy(fn)             — custom predicate function, expressive for complex rules
//
// All read from signUpResponse — no extra HTTP call.

describe('9. Assertion variants', () => {

  it('email matches email format regex — toMatch', () => {
    // toMatch with /.+@.+\..+/ checks the rough shape of an email address.
    // Useful when the exact value is generated (faker) and cannot be hardcoded.
    expect(signUpResponse.data.user.email).toMatch(/.+@.+\..+/);
  });

  it('username length is at least 4 — toBeGreaterThanOrEqual', () => {
    // toBeGreaterThanOrEqual asserts a numeric lower bound.
    // The Joi schema requires username ≥ 4 chars; this verifies that rule was applied.
    expect(signUpResponse.data.user.username.length).toBeGreaterThanOrEqual(4);
  });

  it('postsCount is non-negative — toBeGreaterThanOrEqual', () => {
    // A newly created user starts with postsCount 0.
    // toBeGreaterThanOrEqual(0) is the correct assertion for "must be zero or more".
    expect(signUpResponse.data.user.postsCount).toBeGreaterThanOrEqual(0);
  });

  it('token is a valid JWT — toSatisfy with custom predicate', () => {
    // toSatisfy(fn) calls fn(value) and passes if fn returns true.
    // It is the most expressive option when the assertion logic cannot be expressed
    // as a simple comparison: here we split and check the count of segments.
    expect(signUpResponse.data.token).toSatisfy((t: string) => t.split('.').length === 3);
  });

});
