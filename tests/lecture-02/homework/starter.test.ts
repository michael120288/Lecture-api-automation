// Lecture 02 — Homework (starter)
//
// Complete the 5 TODO items below.
// Run: npm test tests/lecture-02/homework/starter.test.ts
// Goal: 7 tests passing

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../../src/config';

const signinUrl = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let response!: AxiosResponse;
let sessionCookie: string = '';

beforeAll(async () => {
  response = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });

  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
});

afterAll(async () => {
  if (!sessionCookie) return;
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// TODO 1 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll (no new request needed).
//
// Assert ALL of the following on the signin response in ONE test:
//   - status is 200
//   - response.data.message is "User login successfully"
//   - response.data.token is defined
//   - response.data.user is defined
//
// Hint: you can have multiple expect() calls in one it() block
it('successful signin returns status 200 with token and user', () => {
  // write your code here

});

// TODO 2 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll.
//
// The JWT token has THREE parts separated by dots (header.payload.signature).
// Split the token on '.' and assert that:
//   - There are exactly 3 parts
//   - The first part (header) starts with 'eyJ' (base64url encoded JSON always does)
//
// Hint: string.split('.')
// Hint: array[0].startsWith('eyJ')
it('token has valid JWT format', () => {
  // write your code here

});

// TODO 3 ──────────────────────────────────────────────────────────────────────
// Using `response` and `sessionCookie` from beforeAll.
//
// Assert:
//   - The set-cookie header is defined
//   - sessionCookie contains the string 'session='
//   - The user object does NOT have a 'password' field
//
// Hint: .not.toHaveProperty('password')
it('cookie is set and password is not exposed', () => {
  // write your code here

});

// TODO 4 ──────────────────────────────────────────────────────────────────────
// Make a NEW request to GET /currentuser using the sessionCookie.
// Assert that the response status is 200.
//
// Hint: axios.get(url, { headers: { Cookie: sessionCookie }, validateStatus: () => true })
it('session cookie works for authenticated request', async () => {
  // write your code here

});

// TODO 5 ──────────────────────────────────────────────────────────────────────
// Using .then() style (not async/await).
//
// Sign in again with WRONG password.
// Assert the response status is 400 OR 429 (use expectRejected from test-utils).
//
// Rules: no `async`, must return the promise.
//
// Hint: import { expectRejected } from '../../../src/test-utils'
it('wrong password is rejected — .then() style', () => {
  // write your code here

});

// TODO 6 ──────────────────────────────────────────────────────────────────────
// Using `response` from beforeAll (no new request needed).
//
// Use toMatch() with a regex to assert the token has JWT format.
// A JWT looks like: xxxxx.yyyyy.zzzzz — three base64url segments separated by dots.
// The regex /^[\w-]+\.[\w-]+\.[\w-]+$/ matches exactly that shape.
//
// Hint: expect(response.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
it('token matches JWT regex — toMatch', () => {
  // write your code here

});

// TODO 7 ──────────────────────────────────────────────────────────────────────
// Using `sessionCookie` from beforeAll (no new request needed).
//
// Use expect.stringMatching() as an asymmetric matcher inside toEqual() to assert
// that the sessionCookie contains the string "session=".
//
// Hint: expect(value).toEqual(expect.stringMatching(/session=/))
// Note: expect.stringMatching is different from toMatch — it is an asymmetric matcher
//       that can be nested inside toMatchObject or toEqual
it('session cookie matches "session=" pattern — expect.stringMatching', () => {
  // write your code here

});
