// Lecture 06 — Homework SOLUTION
// Run: npm test tests/lecture-06/homework/solution.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { TEST_CLEANUP_SECRET } from '../../../src/fixtures';

const signinUrl   = `${config.BASE_URL}/signin`;
const postUrl     = `${config.BASE_URL}/post`;
const getAllUrl    = `${config.BASE_URL}/post/all/1`;
const reactionUrl = `${config.BASE_URL}/post/reaction`;
const signoutUrl  = `${config.BASE_URL}/signout`;

let sessionCookie: string = '';
let postId: string = '';
let postOwnerUserId: string = '';

const ZERO_REACTIONS = { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 };
const POST_CONTENT = `Vitest hw-06-sol ${Date.now()}`;

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  await axios.post(postUrl, { post: POST_CONTENT, bgColor: '#fff', privacy: 'Public', feelings: '' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const getRes = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  const found = getRes.data.posts?.find((p: { post: string; _id: string; userId: string }) => p.post === POST_CONTENT);
  postId = found?._id ?? '';
  postOwnerUserId = found?.userId ?? '';
});

afterAll(async () => {
  if (postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// Solution 1
it('adding love reaction returns 200', async () => {
  const res = await axios.post(reactionUrl, {
    userTo: postOwnerUserId, postId, type: 'love',
    previousReaction: '', postReactions: ZERO_REACTIONS, profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  expect(res.status).toBe(200);
  expect(res.data.message).toBe('Reaction added successfully');
});

// Solution 2
it('GET reactions shows at least one reaction', async () => {
  const res = await axios.get(`${config.BASE_URL}/post/reactions/${postId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.data.count).toBeGreaterThanOrEqual(1);
  expect(res.data.reactions.length).toBeGreaterThanOrEqual(1);
});

// Solution 3
// Title-case the username — Chatty stores usernames in title case.
// If TEST_USERNAME is 'vitestuser', Chatty stores 'Vitestuser'.
// The single reaction endpoint looks up by username as stored in Redis.
it('GET single reaction by username returns 200', async () => {
  const username = config.TEST_USERNAME;
  const titleCased = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  const res = await axios.get(
    `${config.BASE_URL}/post/single/reaction/username/${titleCased}/${postId}`,
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );
  expect(res.status).toBe(200);
  expect(res.data).toHaveProperty('reactions');
});

// Solution 4
// encodeURIComponent converts JSON characters to URL-safe equivalents.
// { must become %7B, " becomes %22, : becomes %3A, etc.
// Without encoding, the server would mis-parse the URL path.
it('DELETE reaction with encoded URL param returns 200', async () => {
  const reactions = { like: 0, love: 1, happy: 0, sad: 0, wow: 0, angry: 0 };
  const encoded = encodeURIComponent(JSON.stringify(reactions));
  const res = await axios.delete(
    `${config.BASE_URL}/post/reaction/${postId}/love/${encoded}`,
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );
  expect(res.status).toBe(200);
});

// Solution 5
// .then() style: no async, must return the promise.
// After removing, the count should be 0.
it('GET reactions count is 0 after removal — .then() style', () => {
  return axios.get(`${config.BASE_URL}/post/reactions/${postId}`, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  }).then(res => {
    expect(res.data.count).toBe(0);
  });
});

// Solution 6
// WHY expect.stringContaining: the exact message text might be 'Reaction added successfully'
// or a similar variant. Using an asymmetric matcher means the test remains passing even if
// the API adds extra words, while still guaranteeing the core intent ('successfully') is present.
it('add reaction message contains "successfully" (expect.stringContaining)', async () => {
  const res = await axios.post(reactionUrl, {
    userTo: postOwnerUserId,
    postId,
    type: 'wow',
    previousReaction: '',
    postReactions: ZERO_REACTIONS,
    profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  expect(res.data).toMatchObject({
    message: expect.stringContaining('successfully'),
  });
});

// Solution 7
// WHY toBeTypeOf: this is the Vitest-idiomatic way to assert a runtime type.
// It is more readable than `expect(typeof postId).toBe('string')` and produces
// a clearer failure message when the value is unexpectedly undefined or a number.
it('postId is a string (toBeTypeOf)', () => {
  expect(postId).toBeTypeOf('string');
});
