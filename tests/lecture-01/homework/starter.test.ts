// Lecture 01 — Homework (starter)
//
// Complete the 5 TODO items below.
// Do NOT look at solution.test.ts until you have tried each one yourself.
//
// Before starting — read lecture.test.ts sections 1–8 in full.
// Each TODO here maps to a specific section.
//
// Run: npm test tests/lecture-01/homework/starter.test.ts
// Goal: 7 tests passing

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../../src/config';

const url = `${config.BASE_URL}/signin`;
const wrongCredentials = { username: 'notarealuser99999', password: 'WrongPass@9999' };

// ─── Shared request (section 3 pattern) ──────────────────────────────────────
//
// Make ONE request here for TODOs 1, 2, 3 and 4.
// Do NOT make a new axios.post() inside each of those tests.
// This is the efficient pattern from lecture section 3.

let response!: AxiosResponse;

beforeAll(async () => {
  // TODO 0 (already done for you) — make the shared request
  response = await axios.post(url, wrongCredentials, {
    validateStatus: () => true,
  });
});

// TODO 1 ──────────────────────────────────────────────────────────────────────
// Using response from beforeAll (no new request needed).
//
// Assert the FULL response shape using toMatchObject().
// The error response has three fields: message (string), status (string), statusCode (number).
// Use expect.any(String) and expect.any(Number) for the type checks.
//
// Hint: toMatchObject({ key: value, ... })
// Hint: expect.any(String), expect.any(Number)
// Hint: status should be the string "error", not the HTTP status code
it('response body matches the error shape', () => {
  // write your code here

});

// TODO 2 ──────────────────────────────────────────────────────────────────────
// Using response from beforeAll (no new request needed).
//
// Write THREE negative assertions on the same response object:
//   - the body does NOT have a "token" field
//   - the body does NOT have a "user" field
//   - the body does NOT have a "password" field
//
// Hint: expect(response.data).not.toHaveProperty('...')
it('response does not leak token, user, or password', () => {
  // write your code here — 3 assertions in this one test

});

// TODO 3 ──────────────────────────────────────────────────────────────────────
// Using response from beforeAll (no new request needed).
//
// Assert the Content-Type header contains 'application/json'.
// Then assert that the response status is NOT 200 and NOT 201.
//
// Hint: response.headers['content-type']
// Hint: .toContain() for the header
// Hint: .not.toBe() for the status checks
it('Content-Type is JSON and status is not a success code', () => {
  // write your code here — 3 assertions

});

// TODO 4 ──────────────────────────────────────────────────────────────────────
// NEW request — test a BOUNDARY VALUE.
//
// Send a POST to /signin with a username that is only 3 characters ('abc').
// According to the Joi schema, username must be at least 4 chars.
// Assert:
//   - The response is rejected (status 400 OR 429 — use the pattern below)
//   - If status is 400, the message contains 'Invalid username'
//
// IMPORTANT: do not use expectRejected from lecture.test.ts — write it inline:
//   expect([400, 429]).toContain(res.status)
//
// Why [400, 429]? Because running against production may hit the rate limiter.
// See lecture section 6 for the full explanation.
it('username shorter than 4 chars is rejected', async () => {
  const res = await axios.post(
    url,
    { username: 'abc', password: 'ValidPass@1' },
    { validateStatus: () => true },
  );

  // write your assertions here

});

// TODO 5 ──────────────────────────────────────────────────────────────────────
// Rewrite TODO 1 using .then() instead of async/await.
//
// Same assertion: response body matches the error shape using toMatchObject().
// Same guard: if status is 429, skip the shape check.
//
// Rules:
//   - Do NOT use `async` on the test function
//   - You MUST return the Promise
//   - Make a fresh axios.post() call inside the .then() chain (don't use the shared response)
it('response body matches error shape — .then() style', () => {
  // write your code here

});

// TODO 6 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll (no new request needed).
//
// Use toMatch() with a regex to assert that the message is a non-empty string.
// The regex /\S+/ matches any string that contains at least one non-whitespace character.
//
// Hint: expect(value).toMatch(/\S+/)
it('message matches non-empty string regex — toMatch', () => {
  // write your code here

});

// TODO 7 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll (no new request needed).
//
// Write TWO assertions in this test:
//   1. Use toBeTypeOf('number') to assert that response.data.statusCode is a number.
//   2. Use toBeTruthy() to assert that response.data.message is truthy.
//
// Hint: toBeTypeOf is Vitest-specific — do not use `typeof x === 'number'` here
// Hint: any non-empty string is truthy
it('statusCode is type number and message is truthy', () => {
  // write your code here

});
