// Lecture 03 — Homework (starter)
//
// Complete the 5 TODO items below.
// Run: npm test tests/lecture-03/homework/starter.test.ts
// Goal: 7 tests passing

import axios, { type AxiosResponse } from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../../src/config';
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
  }, { validateStatus: () => true });

  authId = response.data.user?.authId ?? '';
});

afterAll(async () => {
  if (!authId) return;
  await axios.delete(`${config.BASE_URL}/test/cleanup/user/${authId}`, {
    headers: { 'x-test-secret': TEST_CLEANUP_SECRET },
    validateStatus: () => true,
  });
});

// TODO 1 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll.
//
// Assert ALL of the following in ONE test:
//   - status is 201
//   - message is "User created successfully"
//   - user._id is a non-empty string
//   - user.authId is a non-empty string
//   - password is NOT in the user object
it('signup response has correct status, message, and user shape', () => {
  // write your code here

});

// TODO 2 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll.
//
// Assert that the response body matches this shape using toMatchObject():
//   message: any string
//   token: any string
//   user: any object
//
// Then add a second assertion: token has exactly 3 parts when split on '.'
it('response body matches expected shape and token is valid JWT', () => {
  // write your code here

});

// TODO 3 ──────────────────────────────────────────────────────────────────────
// Make a NEW request — attempt to sign up with the SAME email that was used in beforeAll.
// (Use a different username so only the email causes the conflict.)
//
// Assert:
//   - status is 400 OR 429 (use expectRejected from test-utils)
//   - if status is 400, message contains 'already'
//
// Hint: import { expectRejected } from '../../../src/test-utils'
// Hint: response.data.email is the email that was used in beforeAll
it('duplicate email returns 400', async () => {
  // write your code here

});

// TODO 4 ──────────────────────────────────────────────────────────────────────
// Make a NEW request to signup with a password that has no special character.
// Use a fresh username and email (faker) so there's no duplicate conflict.
//
// Example password that fails: 'TestPassword123' (no @$!%*?&)
//
// Assert:
//   - status is 400 OR 429
//   - if status is 400, message contains 'must contain'
it('password without special character is rejected', async () => {
  // write your code here

});

// TODO 5 ──────────────────────────────────────────────────────────────────────
// Using .then() style (no async/await).
//
// Make a request to the cleanup endpoint with a WRONG secret.
// Assert the response status is 403.
//
// Rules: no `async`, must return the promise.
// Hint: axios.delete(url, { headers: { 'x-test-secret': 'wrongsecret' }, validateStatus: () => true })
it('cleanup endpoint returns 403 with wrong secret — .then() style', () => {
  // write your code here

});

// TODO 6 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll (no new request needed).
//
// Use toMatch() to assert that response.data.user.email matches an email format.
// The regex /.+@.+\..+/ checks the rough shape (anything @ anything . anything).
//
// Hint: expect(response.data.user.email).toMatch(/.+@.+\..+/)
it('email matches email format regex — toMatch', () => {
  // write your code here

});

// TODO 7 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll (no new request needed).
//
// Use toSatisfy() with a custom predicate to assert that the token is a valid JWT.
// A valid JWT has exactly 3 parts when split on '.'.
//
// Hint: expect(value).toSatisfy((t: string) => t.split('.').length === 3)
// Note: toSatisfy(fn) calls fn(value) and the test passes if fn returns true
it('token is a valid JWT — toSatisfy with custom predicate', () => {
  // write your code here

});
