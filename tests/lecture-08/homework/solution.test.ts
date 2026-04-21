// Lecture 08 — Homework SOLUTION
// Run: npm test tests/lecture-08/homework/solution.test.ts

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
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
  const cur = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  originalYoutube = cur.data.user?.social?.youtube ?? '';
});

afterAll(async () => {
  await axios.put(socialLinksUrl, { youtube: originalYoutube }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

it('GET /user/all/1 has users, totalUsers, followers', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/all/1`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.data.users)).toBe(true);
  expect(res.data.totalUsers).toBeGreaterThan(0);
  expect(Array.isArray(res.data.followers)).toBe(true);
});

it('search for "vitest" returns at least one result', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/profile/search/vitest`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(res.data.search.length).toBeGreaterThanOrEqual(1);
});

it('PUT social links + GET currentuser — state verification', async () => {
  await axios.put(socialLinksUrl, { youtube: 'https://youtube.com/vitest' }, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.data.user.social.youtube).toBe('https://youtube.com/vitest');
});

it('change-password with empty body returns 400', async () => {
  const res = await axios.put(changePwUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(400);
});

// The mismatch error message: 'Confirm password does not match new password.'
it('change-password mismatch returns 400 — .then() style', () => {
  return axios.put(changePwUrl, {
    currentPassword: 'Test1',
    newPassword: 'Test2',
    confirmPassword: 'Test3',
  }, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  }).then(res => {
    expect(res.status).toBe(400);
  });
});

// Solution 6
// WHY toBeGreaterThanOrEqual: totalUsers grows over time as new users register.
// Pinning an exact value would make the test fragile. A lower-bound check of >= 0
// validates the field is a meaningful number without coupling to the current count.
it('totalUsers is non-negative (toBeGreaterThanOrEqual)', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/all/1`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.data.totalUsers).toBeGreaterThanOrEqual(0);
});

// Solution 7
// WHY toBeTruthy: username should never be an empty string, null, or undefined.
// toBeTruthy is the simplest assertion for "this value is present and meaningful"
// without over-specifying what the exact string is. It catches cases where the
// field is accidentally stripped or set to an empty string by the API.
it('first search result username is truthy (toBeTruthy)', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/profile/search/vitest`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  if (res.data.search.length === 0) return;
  expect(res.data.search[0].username).toBeTruthy();
});
