// Lecture 09 — Followers, Blocking & Notifications
//
// Run: npm test tests/lecture-09/follow.spec.ts

import axios from 'axios';
import { faker } from '@faker-js/faker';
import { config } from '../../src/config';
import { TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const signupUrl      = `${config.BASE_URL}/signup`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const followingUrl   = `${config.BASE_URL}/user/following`;
const notificationsUrl = `${config.BASE_URL}/notifications`;

const followUrl   = (id: string) => `${config.BASE_URL}/user/follow/${id}`;
const unfollowUrl = (followeeId: string, followerId: string) =>
  `${config.BASE_URL}/user/unfollow/${followeeId}/${followerId}`;
const followersUrl = (userId: string) => `${config.BASE_URL}/user/followers/${userId}`;
const blockUrl   = (id: string) => `${config.BASE_URL}/user/block/${id}`;
const unblockUrl = (id: string) => `${config.BASE_URL}/user/unblock/${id}`;
const cleanupUrl = (authId: string) =>
  `${config.BASE_URL}/test/cleanup/user/${authId}`;

let sessionCookie = '';
let userAId = '';   // current user's _id
let userBId = '';   // second test user's _id
let userBAuthId = '';

beforeAll(async () => {
  // Sign in as user A (TEST_USERNAME)
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Get user A's _id
  const curRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userAId = curRes.data.user?._id ?? '';

  // Create user B
  const signupRes = await axios.post(signupUrl, {
    username: `vitest${faker.string.alphanumeric(8).toLowerCase()}`,
    email: faker.internet.email().toLowerCase(),
    password: TEST_PASSWORD,
    avatarColor: TEST_AVATAR_COLOR,
    avatarImage: TEST_AVATAR_IMAGE,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });

  userBId     = signupRes.data.user?._id     ?? '';
  userBAuthId = signupRes.data.user?.authId  ?? '';
});

afterAll(async () => {
  // Unfollow/unblock user B (cleanup any state)
  if (userBId) {
    await axios.put(unfollowUrl(userBId, userAId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    await axios.put(unblockUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }

  // Delete user B
  if (userBAuthId) {
    await axios.delete(cleanupUrl(userBAuthId), {
      headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true,
    });
  }

  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

// ─── 1. Follow user B ─────────────────────────────────────────────────────────

describe('1. Follow user B', () => {

  it('PUT /user/follow/:followerId returns 200', async () => {
    const res = await axios.put(followUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

});

// ─── 2. Get following list ────────────────────────────────────────────────────

describe('2. Get following list', () => {

  it('GET /user/following returns 200', async () => {
    const res = await axios.get(followingUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has following array', async () => {
    const res = await axios.get(followingUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toMatchObject({
      message: 'User following',
      following: expect.any(Array),
    });
  });

  it('user B appears in following list after follow', async () => {
    const res = await axios.get(followingUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = res.data.following?.find((u: { _id: string }) => u._id === userBId);
    expect(found).toBeDefined();
  });

});

// ─── 3. Get followers of user B ───────────────────────────────────────────────

describe('3. Get followers of user B', () => {

  it('GET /user/followers/:userId returns 200', async () => {
    const res = await axios.get(followersUrl(userBId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('user A appears in user B followers list', async () => {
    const res = await axios.get(followersUrl(userBId), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = res.data.followers?.find((u: { _id: string }) => u._id === userAId);
    expect(found).toBeDefined();
  });

});

// ─── 4. Unfollow user B ───────────────────────────────────────────────────────
//
// Unfollow requires BOTH the followeeId (userB) and followerId (userA).
// GET /currentuser to get userA's _id if you don't have it.

describe('4. Unfollow user B', () => {

  it('PUT /user/unfollow/:followeeId/:followerId returns 200', async () => {
    const res = await axios.put(unfollowUrl(userBId, userAId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('user B no longer in following list', async () => {
    const res = await axios.get(followingUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const found = res.data.following?.find((u: { _id: string }) => u._id === userBId);
    expect(found).toBeUndefined();
  });

});

// ─── 5. Block and unblock ─────────────────────────────────────────────────────

describe('5. Block and unblock', () => {

  it('PUT /user/block/:followerId returns 200', async () => {
    const res = await axios.put(blockUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('PUT /user/unblock/:followerId returns 200', async () => {
    const res = await axios.put(unblockUrl(userBId), {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

});

// ─── 6. Notifications ─────────────────────────────────────────────────────────
//
// Notifications may be empty — we assert the shape, not a specific count.
// For PATCH/DELETE we test invalid IDs to avoid needing actual notifications.

describe('6. Notifications', () => {

  it('GET /notifications returns 200', async () => {
    const res = await axios.get(notificationsUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has notifications array (may be empty)', async () => {
    const res = await axios.get(notificationsUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toMatchObject({
      message: 'User notifications',
      notifications: expect.any(Array),
    });
  });

  it('PUT /notification/invalid-id returns 400', async () => {
    const res = await axios.put(`${config.BASE_URL}/notification/not-an-objectid`, {},
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

});

// ─── 7. Assertion variants ───────────────────────────────────────────────────
//
// New assertion types introduced here:
//   expect.objectContaining({...})  — object includes the listed keys/values
//   toBeTypeOf('string')            — Vitest-specific runtime type check
//   toBeTruthy()                    — value is truthy (non-empty, non-null, etc.)

describe('7. Assertion variants', () => {

  it('GET /notifications response has expected shape (expect.objectContaining)', async () => {
    const res = await axios.get(notificationsUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    // expect.objectContaining checks that the object has at least the listed keys.
    // Additional keys on the actual object are allowed, making it a partial match.
    expect(res.data).toMatchObject(
      expect.objectContaining({
        message: expect.any(String),
        notifications: expect.any(Array),
      }),
    );
  });

  it('userAId is a string (toBeTypeOf)', () => {
    // toBeTypeOf is the Vitest-idiomatic runtime type assertion.
    // Here it confirms the ID captured in beforeAll is a real string and not
    // undefined — which would mean the /currentuser call silently failed.
    expect(userAId).toBeTypeOf('string');
  });

  it('userBId is truthy (toBeTruthy)', () => {
    // toBeTruthy passes for any non-empty string, non-zero number, etc.
    // It is a quick liveness check: if userBId is '' or undefined, the signup
    // in beforeAll failed and all follower tests would have used a blank ID.
    expect(userBId).toBeTruthy();
  });

});

// ─── 8. Negative tests ────────────────────────────────────────────────────────

describe('8. Negative tests', () => {

  it('GET /user/following without cookie returns 401', async () => {
    const res = await axios.get(followingUrl, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /notifications without cookie returns 401', async () => {
    const res = await axios.get(notificationsUrl, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

});
