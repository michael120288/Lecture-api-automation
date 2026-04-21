// Lecture 09 — Homework (starter)
// Run: npm test tests/lecture-09/homework/starter.test.ts

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

  userBId     = signupRes.data.user?._id     ?? '';
  userBAuthId = signupRes.data.user?.authId  ?? '';
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

// TODO 1 — Follow user B. Assert status 200.
it('follow user B returns 200', async () => {
  // write your code here
});

// TODO 2 — GET /user/following. Assert status 200 and user B's _id is in the following list.
it('GET following shows user B', async () => {
  // write your code here
});

// TODO 3 — GET /user/followers/:userBId. Assert user A's _id is in the followers list.
it('GET followers of user B includes user A', async () => {
  // write your code here
});

// TODO 4 — Unfollow user B with PUT /user/unfollow/:userBId/:userAId
// Then GET /user/following and assert user B is NOT in the list.
it('unfollow user B — no longer in following list', async () => {
  // write your code here
});

// TODO 5 — Using .then() style:
// GET /notifications. Assert status 200 and notifications is an array.
it('GET notifications returns array — .then() style', () => {
  // write your code here — no async, must return promise
});

// TODO 6 — GET /user/followers/:userBId after following.
// Assert followersCount (res.data.followers.length) is >= 0 using toBeGreaterThanOrEqual.
// Hint: expect(res.data.followers.length).toBeGreaterThanOrEqual(0)
it('followers count is non-negative (toBeGreaterThanOrEqual)', async () => {
  // write your code here

});

// TODO 7 — GET /user/following. If the following array is non-empty,
// assert the first entry's username is truthy using toBeTruthy().
// Hint: expect(res.data.following[0].username).toBeTruthy()
it('first following entry username is truthy (toBeTruthy)', async () => {
  // write your code here

});
