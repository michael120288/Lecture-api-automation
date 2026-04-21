// Lecture 05 — Homework SOLUTION
//
// Run: npm test tests/lecture-05/homework/solution.test.ts

import axios from 'axios';
import { config } from '../../../src/config';

const signinUrl  = `${config.BASE_URL}/signin`;
const postUrl    = `${config.BASE_URL}/post`;
const getAllUrl   = `${config.BASE_URL}/post/all/1`;
const signoutUrl = `${config.BASE_URL}/signout`;

let sessionCookie: string = '';
let postId: string = '';
let postDeleted = false;

const CONTENT = `Vitest homework-05 ${Date.now()}`;

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  await axios.post(postUrl, { post: CONTENT, bgColor: '#fff', privacy: 'Public', feelings: '' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const getRes = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const found = getRes.data.posts?.find((p: { post: string; _id: string }) => p.post === CONTENT);
  postId = found?._id ?? '';
});

afterAll(async () => {
  if (!postDeleted && postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

// ─── Solution 1 ───────────────────────────────────────────────────────────────
// toBeGreaterThan(0) on totalPosts — there should be at least one post since we
// just created one in beforeAll. This also verifies the count field exists.
it('GET /post/all/1 returns posts array with totalPosts', async () => {
  const res = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  expect(res.status).toBe(200);
  expect(Array.isArray(res.data.posts)).toBe(true);
  expect(res.data.totalPosts).toBeGreaterThan(0);
});

// ─── Solution 2 ───────────────────────────────────────────────────────────────
// find() by content — this is how we locate our specific post in the list.
// reactions.like === 0 proves a freshly created post has no reactions yet.
// A new post always starts with all reactions at zero.
it('our post is in the list with correct content and zero reactions', async () => {
  const res = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  const post = res.data.posts?.find((p: { post: string }) => p.post === CONTENT);
  expect(post).toBeDefined();
  expect(post.post).toBe(CONTENT);
  expect(post.reactions.like).toBe(0);
});

// ─── Solution 3 ───────────────────────────────────────────────────────────────
// PATCH then GET — the state verification pattern.
// We find the post by _id (not content) because the content just changed.
// Redis is updated synchronously, so GET immediately reflects the new content.
it('PATCH updates content — GET confirms the change', async () => {
  await axios.patch(`${config.BASE_URL}/post/${postId}`, {
    post: 'Updated by homework',
    bgColor: '#fff',
    privacy: 'Public',
    feelings: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const res = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  const updated = res.data.posts?.find((p: { _id: string }) => p._id === postId);
  expect(updated?.post).toBe('Updated by homework');
});

// ─── Solution 4 ───────────────────────────────────────────────────────────────
// No cookie → auth middleware rejects immediately → 401.
// The post body is irrelevant — the request fails before Joi validation.
it('POST /post without cookie returns 401', async () => {
  const res = await axios.post(postUrl,
    { post: 'should not be created' },
    { validateStatus: () => true },
  );
  expect(res.status).toBe(401);
});

// ─── Solution 5 ───────────────────────────────────────────────────────────────
// Delete then verify absence.
// Setting postDeleted = true prevents afterAll from attempting a double delete.
// find() returning undefined proves the post is gone from the Redis cache.
it('DELETE /post removes the post from the list', async () => {
  const deleteRes = await axios.delete(`${config.BASE_URL}/post/${postId}`, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  expect(deleteRes.status).toBe(200);
  postDeleted = true;

  const getRes = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  const stillThere = getRes.data.posts?.find((p: { _id: string }) => p._id === postId);
  expect(stillThere).toBeUndefined();
});

// ─── Solution 6 ───────────────────────────────────────────────────────────────
// expect.arrayContaining([x, y, …]) asserts that EVERY listed element appears
// somewhere in the actual array. Extra items in the array are allowed.
// expect.objectContaining inside it means the element must at least have those keys.
//
// WHY expect.arrayContaining instead of checking posts[0] directly?
// Checking posts[0] only validates one item and assumes the array is non-empty.
// expect.arrayContaining with objectContaining asserts that the array structure
// is correct for ALL matched items — it is more robust when the page order varies.
it('posts array contains objects with _id — expect.arrayContaining', async () => {
  const res = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  const posts = res.data.posts ?? [];
  expect(posts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ _id: expect.any(String) }),
    ]),
  );
});

// ─── Solution 7 ───────────────────────────────────────────────────────────────
// toBeLessThanOrEqual(10) asserts an upper bound — the page size must not exceed 10.
//
// WHY toBeLessThanOrEqual instead of toBe(10)?
// The actual count on page 1 depends on how many posts exist in the database.
// If there are fewer than 10 posts, toBe(10) would fail.
// toBeLessThanOrEqual(10) correctly encodes the contract: "at most 10 per page"
// without assuming the database has exactly 10 items.
it('page 1 returns at most 10 posts — toBeLessThanOrEqual', async () => {
  const res = await axios.get(getAllUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  const posts = res.data.posts ?? [];
  expect(posts.length).toBeLessThanOrEqual(10);
});
