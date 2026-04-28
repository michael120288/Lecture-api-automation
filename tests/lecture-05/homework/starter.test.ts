// Lecture 05 — Homework (starter)
//
// Complete the 5 TODO items below.
// Run: npm test tests/lecture-05/homework/starter.test.ts
// Goal: 7 tests passing

import axios from 'axios';
import { config } from '../../../src/config';
import { TEST_CLEANUP_SECRET } from '../../../src/fixtures';

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
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

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

// TODO 1 ──────────────────────────────────────────────────────────────────────
// Using `postId` from beforeAll.
// Call GET /post/all/1 and assert:
//   - status is 200
//   - posts is an array
//   - totalPosts is a number greater than 0
it('GET /post/all/1 returns posts array with totalPosts', async () => {
  // write your code here

});

// TODO 2 ──────────────────────────────────────────────────────────────────────
// Using `postId` from beforeAll.
// Find our post in GET /post/all/1 and assert:
//   - the post content equals CONTENT
//   - reactions.like equals 0
it('our post is in the list with correct content and zero reactions', async () => {
  // write your code here

});

// TODO 3 ──────────────────────────────────────────────────────────────────────
// Update the post using PATCH /post/:postId
// Change the content to "Updated by homework"
// Then GET /post/all/1 and assert the post now shows the updated content.
//
// Hint: make the PATCH, then the GET, then find the post by _id and check .post
it('PATCH updates content — GET confirms the change', async () => {
  // write your code here

});

// TODO 4 ──────────────────────────────────────────────────────────────────────
// Send a POST /post request WITHOUT a cookie.
// Assert status is 401.
it('POST /post without cookie returns 401', async () => {
  // write your code here

});

// TODO 5 ──────────────────────────────────────────────────────────────────────
// Delete the post using DELETE /post/:postId.
// Assert status is 200.
// Set postDeleted = true so afterAll skips the cleanup.
//
// Then verify: call GET /post/all/1 and assert the post is NOT in the list.
// Hint: .find() on the posts array — it should return undefined
it('DELETE /post removes the post from the list', async () => {
  // write your code here

});

// TODO 6 ──────────────────────────────────────────────────────────────────────
// Call GET /post/all/1 with the session cookie.
// Use expect.arrayContaining() to assert the posts array contains at least one
// object that has an _id field (any string value).
//
// Hint: expect(posts).toEqual(expect.arrayContaining([expect.objectContaining({ _id: expect.any(String) })]))
// Note: expect.arrayContaining checks that ALL listed elements appear somewhere in the array.
//       Extra items in the actual array are allowed.
it('posts array contains objects with _id — expect.arrayContaining', async () => {
  // write your code here

});

// TODO 7 ──────────────────────────────────────────────────────────────────────
// Call GET /post/all/1 with the session cookie.
// Assert that the number of posts returned is at most 10 using toBeLessThanOrEqual(10).
// The API returns a maximum of 10 posts per page.
//
// Hint: expect(posts.length).toBeLessThanOrEqual(10)
it('page 1 returns at most 10 posts — toBeLessThanOrEqual', async () => {
  // write your code here

});
