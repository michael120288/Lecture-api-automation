// Lecture 03 — Homework SOLUTION
//
// Run: npm test tests/lecture-03/homework/solution.test.ts

import axios, { type AxiosResponse } from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../../src/config';
import { expectRejected } from '../../../src/test-utils';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../../src/fixtures';

const signupUrl = `${config.BASE_URL}/signup`;

let response!: AxiosResponse;
let authId: string = '';

beforeAll(async () => {
  response = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });

  authId = response.data.user?.authId ?? '';
});

afterAll(async () => {
  if (!authId) return;
  await axios.delete(`${config.BASE_URL}/test/cleanup/user/${authId}`, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });
});

// ─── Solution 1 ───────────────────────────────────────────────────────────────
// Multiple expect() calls in one test for related assertions.
// All five assertions verify "this signup was successful" — they belong together.
// Note: status is 201 (Created), not 200 (OK). Signup creates a resource.
it('signup response has correct status, message, and user shape', () => {
  expect(response.status).toBe(201);
  expect(response.data.message).toBe('User created successfully');
  expect(typeof response.data.user._id).toBe('string');
  expect(response.data.user._id.length).toBeGreaterThan(0);
  expect(typeof response.data.user.authId).toBe('string');
  expect(response.data.user.authId.length).toBeGreaterThan(0);
  expect(response.data.user).not.toHaveProperty('password');
});

// ─── Solution 2 ───────────────────────────────────────────────────────────────
// toMatchObject checks the structure without caring about extra fields.
// The JWT check (3 parts) confirms the token is well-formed.
// First part always starts with 'eyJ' because JWT headers encode to that base64 prefix.
it('response body matches expected shape and token is valid JWT', () => {
  expect(response.data).toMatchObject({
    message: expect.any(String),
    token: expect.any(String),
    user: expect.any(Object),
  });

  const parts = response.data.token.split('.');
  expect(parts).toHaveLength(3);
});

// ─── Solution 3 ───────────────────────────────────────────────────────────────
// Duplicate email check — same email, different username.
// The server checks BOTH username AND email for conflicts.
// Both return the same message: 'User already exists. Username or email is already taken.'
// We use .toContain('already') to avoid a brittle exact-string match.
it('duplicate email returns 400', async () => {
  const res = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: response.data.user.email, // same email from beforeAll
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  expectRejected(res.status);
  if (res.status === 400) {
    expect(res.data.message).toContain('already');
  }
});

// ─── Solution 4 ───────────────────────────────────────────────────────────────
// Password pattern check — Joi validates the password BEFORE Cloudinary upload.
// 'TestPassword123' has uppercase + lowercase + digits but no special character.
// The pattern requires at least one of: @ $ ! % * ? &
// Error message: 'Password must contain at least one uppercase letter, one lowercase
//   letter, one number, and one special character (@$!%*?&)'
// We use .toContain('must contain') as a substring match.
it('password without special character is rejected', async () => {
  const res = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: 'TestPassword123',
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });

  expectRejected(res.status);
  if (res.status === 400) {
    expect(res.data.message).toContain('must contain');
  }
});

// ─── Solution 5 ───────────────────────────────────────────────────────────────
// .then() style with DELETE request.
// Key reminders: no `async`, MUST return the promise.
// The cleanup endpoint is protected by x-test-secret — a wrong value → 403 Forbidden.
// 403 is different from 401: 401 means "not authenticated", 403 means "authenticated
// but not allowed". Here the request is received and understood — it's just rejected
// because the secret doesn't match.
it('cleanup endpoint returns 403 with wrong secret — .then() style', () => {
  return axios.delete(
    `${config.BASE_URL}/test/cleanup/user/${authId}`,
    {
      headers: { 'x-test-secret': 'wrongsecret' },
      validateStatus: () => true,
    }
  ).then(res => {
    expect(res.status).toBe(403);
  });
});

// ─── Solution 6 ───────────────────────────────────────────────────────────────
// toMatch(/regex/) validates the email format using a pattern.
// /.+@.+\..+/ is a minimal email check: something @ something . something.
//
// WHY toMatch instead of .toContain('@')?
// A regex covers the full structural requirement in one assertion.
// .toContain('@') only verifies the @ is present, not the full shape.
// For dynamically generated values (faker email) a regex is the right tool
// because the exact string is unknown at test-write time.
it('email matches email format regex — toMatch', () => {
  expect(response.data.user.email).toMatch(/.+@.+\..+/);
});

// ─── Solution 7 ───────────────────────────────────────────────────────────────
// toSatisfy(fn) calls fn(value) and the test passes if fn returns true.
// It is the most expressive option for custom rules that cannot be expressed
// as a single matcher.
//
// WHY toSatisfy instead of splitting and using toHaveLength?
// The predicate `t.split('.').length === 3` captures the rule in plain English as code.
// When a custom check spans multiple operations, wrapping them in a predicate
// makes the intent clear and keeps the assertion as a single line.
it('token is a valid JWT — toSatisfy with custom predicate', () => {
  expect(response.data.token).toSatisfy((t: string) => t.split('.').length === 3);
});
