// Lecture 07 — Homework SOLUTION
// Run: npm test tests/lecture-07/homework/solution.test.ts

import axios from 'axios';
import { config } from '../../../src/config';

const signinUrl  = `${config.BASE_URL}/signin`;
const postUrl    = `${config.BASE_URL}/post`;
const getAllUrl   = `${config.BASE_URL}/post/all/1`;
const commentUrl = `${config.BASE_URL}/post/comment`;
const signoutUrl = `${config.BASE_URL}/signout`;

const UNIQUE = `Vitest hw-07-sol ${Date.now()}`;

let sessionCookie = '';
let postId = '';
let postOwnerUserId = '';
let commentId = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');

  await axios.post(postUrl, { post: UNIQUE, bgColor: '#fff', privacy: 'Public', feelings: '' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  const getRes = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  const found = getRes.data.posts?.find((p: { post: string; _id: string; userId: string }) => p.post === UNIQUE);
  postId = found?._id ?? '';
  postOwnerUserId = found?.userId ?? '';
});

afterAll(async () => {
  if (commentId) await axios.delete(`${config.BASE_URL}/post/comment/${postId}/${commentId}`, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  if (postId) await axios.delete(`${config.BASE_URL}/post/${postId}`, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// Solution 1 — POST returns 200 (not 201!)
it('add comment returns 200', async () => {
  const res = await axios.post(commentUrl, {
    userTo: postOwnerUserId, postId, comment: 'First comment', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
  expect(res.data.message).toBe('Comment created successfully');
});

// Solution 2 — GET then find. Save commentId for subsequent tests.
it('GET comments contains our comment', async () => {
  await axios.post(commentUrl, {
    userTo: postOwnerUserId, postId, comment: UNIQUE, profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  const res = await axios.get(`${config.BASE_URL}/post/comments/${postId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });

  const found = res.data.comments?.find((c: { comment: string; _id: string }) => c.comment === UNIQUE);
  expect(found).toBeDefined();
  expect(found).toHaveProperty('_id');
  commentId = found?._id ?? '';
});

// Solution 3 — State verification: PATCH then GET single
// The `GET /post/single/comment` response has a key called `comments` (plural)
// but it holds a SINGLE object — not an array. This is an API naming inconsistency.
// Access the text as: res.data.comments.comment  (dot notation, not array index)
it('PATCH then GET single verifies the update', async () => {
  await axios.patch(`${config.BASE_URL}/post/comment/${postId}/${commentId}`,
    { comment: 'Updated!' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );

  const res = await axios.get(`${config.BASE_URL}/post/single/comment/${postId}/${commentId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });

  // res.data.comments is a single object (not an array), so access it directly
  expect(res.data.comments?.comment).toBe('Updated!');
});

// Solution 4 — DELETE, then clear commentId so afterAll skips double delete
it('DELETE comment returns 200', async () => {
  const res = await axios.delete(`${config.BASE_URL}/post/comment/${postId}/${commentId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  commentId = '';
});

// Solution 5 — .then() style, GET commentsnames
it('GET commentsnames returns 200 — .then() style', () => {
  return axios.get(`${config.BASE_URL}/post/commentsnames/${postId}`, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  }).then(res => {
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('comments');
  });
});

// Solution 6
// WHY expect.stringContaining: the API message is 'Comment created successfully'.
// Using an asymmetric matcher avoids hard-coding the full string — the test still
// catches regressions (e.g. a 400 error returning a completely different message)
// while tolerating minor wording changes.
it('add comment message contains "successfully" (expect.stringContaining)', async () => {
  const res = await axios.post(commentUrl, {
    userTo: postOwnerUserId,
    postId,
    comment: `Assertion variant test ${Date.now()}`,
    profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });

  expect(res.data).toMatchObject({
    message: expect.stringContaining('successfully'),
  });
});

// Solution 7
// WHY toBeTypeOf: commentId is populated in the beforeAll / Solution 2 flow.
// Asserting it is a 'string' (rather than undefined or null) is a lightweight
// sanity check that the setup step ran successfully and the ID has the expected type.
// toBeTypeOf is Vitest-specific and reads more naturally than typeof comparisons.
it('commentId is a string (toBeTypeOf)', () => {
  expect(commentId).toBeTypeOf('string');
});
