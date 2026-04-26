// Lecture 04 — Homework (starter)
//
// Complete the 5 TODO items below.
// Run: npm test tests/lecture-04/homework/starter.test.ts
// Goal: 7 tests passing

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../../src/config';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const basicInfoUrl   = `${config.BASE_URL}/user/profile/basic-info`;
const settingsUrl    = `${config.BASE_URL}/user/profile/settings`;
const signoutUrl     = `${config.BASE_URL}/signout`;

let sessionCookie: string = '';
let originalLocation: string = '';
let originalMessages: boolean = true;

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });

  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  originalLocation = currentRes.data.user?.location ?? '';
  originalMessages = currentRes.data.user?.notifications?.messages ?? true;
});

afterAll(async () => {
  await axios.put(basicInfoUrl,
    { location: originalLocation },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );
  await axios.put(settingsUrl,
    { messages: originalMessages },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

// TODO 1 ──────────────────────────────────────────────────────────────────────
// GET /currentuser with the session cookie.
// Assert ALL of the following in ONE test:
//   - status is 200
//   - isUser is true
//   - user._id is defined
//   - password is NOT in the user object
it('current user response has correct shape', async () => {
  // write your code here

});

// TODO 2 ──────────────────────────────────────────────────────────────────────
// Update the `location` field to "Test City" using PUT /user/profile/basic-info.
// Then GET /currentuser and assert that location is now "Test City".
//
// This is state verification — two requests in one test.
// Hint: make the PUT, then make the GET, then assert on the GET response.
it('PUT /basic-info updates location and GET /currentuser reflects it', async () => {
  // write your code here

});

// TODO 3 ──────────────────────────────────────────────────────────────────────
// Update notification settings: set messages to false.
// Assert:
//   - Status is 200
//   - response.data.settings.messages is false
it('PUT /settings updates messages to false', async () => {
  // write your code here

});

// TODO 4 ──────────────────────────────────────────────────────────────────────
// Send a PUT request to /user/profile/basic-info WITHOUT a cookie.
// Assert the status is 401.
//
// Hint: do not pass headers to axios
it('PUT /basic-info without cookie returns 401', async () => {
  // write your code here

});

// TODO 5 ──────────────────────────────────────────────────────────────────────
// Using .then() style (no async/await).
// Call GET /currentuser with the cookie.
// Assert isUser is true AND token is a string.
//
// Rules: no `async`, must return the promise.
it('current user isUser is true and token is string — .then() style', () => {
  // write your code here

});

// TODO 6 ──────────────────────────────────────────────────────────────────────
// Call GET /currentuser with the session cookie.
// Assert that BOTH of these numeric fields are non-negative using toBeGreaterThanOrEqual(0):
//   - response.data.user.postsCount
//   - response.data.user.followersCount
//
// Hint: toBeGreaterThanOrEqual(0) is the correct assertion for "zero or more"
//       (toBeGreaterThan(0) would fail for a user with no posts or followers)
it('postsCount and followersCount are non-negative — toBeGreaterThanOrEqual', async () => {
  // write your code here

});

// TODO 7 ──────────────────────────────────────────────────────────────────────
// Call GET /currentuser with the session cookie.
// Use toBeTruthy() to assert that response.data.user.username is truthy.
//
// Hint: toBeTruthy() passes for any value that is not false, 0, '', null, undefined, NaN
// Hint: a non-empty string like "Vitestmike" is truthy
it('username is truthy — toBeTruthy', async () => {
  // write your code here

});
