// Lecture 16 — Homework (starter)
// Run: npm test tests/lecture-16/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE } from '../../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let sessionCookie = '';
let userId = '';
let username = '';
let uId = '';

beforeAll(async () => {
  const r = await axios.post(signinUrl, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
  const cur = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  userId   = cur.data.user?._id      ?? '';
  username = cur.data.user?.username ?? '';
  uId      = cur.data.user?.uId      ?? '';
});

afterAll(async () => {
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// TODO 1 — GET /user/profile. Assert status 200, user has _id and username, no password.
it('GET /user/profile returns correct shape', async () => {
  // write your code here
});

// TODO 2 — GET /user/profile/user/suggestions. Assert status 200 and users is an array.
it('GET user suggestions returns array', async () => {
  // write your code here
});

// TODO 3 — POST /images/profile with TEST_AVATAR_IMAGE. Assert status 200, message "Image added successfully".
it('POST /images/profile returns 200', async () => {
  // write your code here
});

// TODO 4 — GET /images/:userId. Assert status 200 and images is an array.
it('GET /images/:userId returns images array', async () => {
  // write your code here
});

// TODO 5 — GET /user/profile/posts/:username/:userId/:uId
// All three URL params are required and all come from GET /currentuser.
// Assert: status 200, response has 'user', 'posts', and 'totalPosts' properties.
//
// Hint: use the username, userId, and uId variables captured in beforeAll
// Hint: uId is a 12-digit numeric string — NOT the same as _id
it('GET /user/profile/posts/:username/:userId/:uId returns profile + posts', async () => {
  // write your code here
});

// TODO 6 (bonus) — .then() style: GET /user/profile/:userId.
// Assert status 200 and user username matches TEST_USERNAME (case-insensitive).
it('GET /user/profile/:userId returns correct user — .then() style', () => {
  // write your code here — no async, must return promise
});

// TODO 7 — GET /images/:userId. Two assertions in one test:
//   1. expect.arrayContaining — assert the array contains objects with an _id field
//      Use: expect(images).toEqual(expect.arrayContaining([expect.objectContaining({ _id: expect.any(String) })]))
//      Skip this assertion if images is empty (length === 0).
//   2. toBeGreaterThanOrEqual — assert images.length >= 0
//      An array can never have negative length — this validates images is a real array.
//
// Hint: both assertions use the same GET /images/:userId response
it('expect.arrayContaining + toBeGreaterThanOrEqual — images array shape and length', async () => {
  // write your code here
});
