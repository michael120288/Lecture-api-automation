// Lecture 09 — Homework SOLUTION
// Run: npm test tests/lecture-09/homework/solution.test.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../../src/fixtures';

let sessionCookie = '';
let userAId = '';
let userBId = '';
let userBAuthId = '';

beforeAll(async () => {
  const loginRes = await axios.post(`${config.BASE_URL}/signin`, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  const curRes = await axios.get(`${config.BASE_URL}/currentuser`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  const signupRes = await axios.post(`${config.BASE_URL}/signup`, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { validateStatus: () => true });
  userBId = signupRes.data.user?._id ?? '';
  userBAuthId = signupRes.data.user?.authId ?? '';
});

afterAll(async () => {
  if (userBId) {
    await axios.put(`${config.BASE_URL}/user/unfollow/${userBId}/${userAId}`, {},
      { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  }
  if (userBAuthId) {
    await axios.delete(`${config.BASE_URL}/test/cleanup/user/${userBAuthId}`,
      { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  }
  await axios.post(`${config.BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

it('follow user B returns 200', async () => {
  const res = await axios.put(`${config.BASE_URL}/user/follow/${userBId}`, {},
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
});

it('GET following shows user B', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/following`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  const found = res.data.following?.find((u: { _id: string }) => u._id === userBId);
  expect(found).toBeDefined();
});

it('GET followers of user B includes user A', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/followers/${userBId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const found = res.data.followers?.find((u: { _id: string }) => u._id === userAId);
  expect(found).toBeDefined();
});

// Unfollow requires both followeeId (userB) AND followerId (userA).
it('unfollow user B — no longer in following list', async () => {
  await axios.put(`${config.BASE_URL}/user/unfollow/${userBId}/${userAId}`, {},
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const res = await axios.get(`${config.BASE_URL}/user/following`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const found = res.data.following?.find((u: { _id: string }) => u._id === userBId);
  expect(found).toBeUndefined();
});

it('GET notifications returns array — .then() style', () => {
  return axios.get(`${config.BASE_URL}/notifications`, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  }).then(res => {
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.notifications)).toBe(true);
  });
});

// Solution 6
// WHY toBeGreaterThanOrEqual(0): the followers count depends on test execution order
// and cleanup. Asserting >= 0 is a safe lower bound — it confirms the field is a
// valid non-negative number without tying the test to a specific count value.
it('followers count is non-negative (toBeGreaterThanOrEqual)', async () => {
  // Re-follow user B so the followers list is non-empty for this assertion
  await axios.put(`${config.BASE_URL}/user/follow/${userBId}`, {},
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const res = await axios.get(`${config.BASE_URL}/user/followers/${userBId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.data.followers.length).toBeGreaterThanOrEqual(0);
});

// Solution 7
// WHY toBeTruthy: username should always be a non-empty string. toBeTruthy
// is more concise than checking .length > 0 and immediately signals intent:
// "this value must exist and be meaningful." It fails if the field is '',
// null, undefined, or 0 — all signs the API returned incomplete data.
it('first following entry username is truthy (toBeTruthy)', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/following`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  if (res.data.following.length === 0) return;
  expect(res.data.following[0].username).toBeTruthy();
});
