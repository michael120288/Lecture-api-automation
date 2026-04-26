// Lecture 08 — Homework (starter)
// Run: npm test tests/lecture-08/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';

const signinUrl      = `${config.BASE_URL}/signin`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const socialLinksUrl = `${config.BASE_URL}/user/profile/social-links`;
const changePwUrl    = `${config.BASE_URL}/user/profile/change-password`;

let sessionCookie = '';
let originalYoutube = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
  const cur = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  originalYoutube = cur.data.user?.social?.youtube ?? '';
});

afterAll(async () => {
  await axios.put(socialLinksUrl, { youtube: originalYoutube }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// TODO 1 — GET /user/all/1. Assert: status 200, users is array, totalUsers > 0, followers is array
it('GET /user/all/1 has users, totalUsers, followers', async () => {
  // write your code here
});

// TODO 2 — GET /user/profile/search/vitest. Assert: status 200, search is array with >= 1 result
it('search for "vitest" returns at least one result', async () => {
  // write your code here
});

// TODO 3 — PUT /user/profile/social-links with youtube: "https://youtube.com/vitest"
// Then GET /currentuser and assert user.social.youtube === "https://youtube.com/vitest"
it('PUT social links + GET currentuser — state verification', async () => {
  // write your code here
});

// TODO 4 — PUT /user/profile/change-password with empty body. Assert status 400.
it('change-password with empty body returns 400', async () => {
  // write your code here
});

// TODO 5 — Using .then() style:
// PUT change-password with mismatched confirmPassword. Assert status 400.
it('change-password mismatch returns 400 — .then() style', () => {
  // write your code here — no async, must return promise
});

// TODO 6 — GET /user/all/1. Assert totalUsers is >= 0 using toBeGreaterThanOrEqual.
// Hint: expect(res.data.totalUsers).toBeGreaterThanOrEqual(0)
it('totalUsers is non-negative (toBeGreaterThanOrEqual)', async () => {
  // write your code here

});

// TODO 7 — GET /user/profile/search/vitest. If results are non-empty,
// assert the first result's username is truthy using toBeTruthy().
// Hint: expect(res.data.search[0].username).toBeTruthy()
it('first search result username is truthy (toBeTruthy)', async () => {
  // write your code here

});
