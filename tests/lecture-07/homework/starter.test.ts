// Lecture 07 — Homework (starter)
// Run: npm test tests/lecture-07/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';

const signinUrl  = `${config.BASE_URL}/signin`;
const postUrl    = `${config.BASE_URL}/post`;
const getAllUrl   = `${config.BASE_URL}/post/all/1`;
const commentUrl = `${config.BASE_URL}/post/comment`;
const signoutUrl = `${config.BASE_URL}/signout`;

const UNIQUE = `Vitest hw-07 ${Date.now()}`;

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

// TODO 1 — POST /post/comment. Assert status 200 and message 'Comment created successfully'
it('add comment returns 200', async () => {
  // write your code here
});

// TODO 2 — After creating a comment, GET /post/comments/:postId
// Find the comment by content UNIQUE. Assert it exists and has an _id field.
// Save the _id to commentId variable.
it('GET comments contains our comment', async () => {
  await axios.post(commentUrl, { userTo: postOwnerUserId, postId, comment: UNIQUE, profilePicture: '' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  // write your code here — find comment, save commentId

});

// TODO 3 — PATCH /post/comment/:postId/:commentId with { comment: "Updated!" }
// Then GET /post/single/comment/:postId/:commentId
// Assert the comment text is now "Updated!"
//
// ⚠️ Hint: GET /post/single/comment returns { message, comments: singleDoc }
//    'comments' (plural key name) holds a SINGLE object — not an array.
//    Access the text as: res.data.comments.comment  (not res.data.comments[0].comment)
it('PATCH then GET single verifies the update', async () => {
  // write your code here

});

// TODO 4 — DELETE /post/comment/:postId/:commentId. Assert status 200. Set commentId = '' after.
it('DELETE comment returns 200', async () => {
  // write your code here

});

// TODO 5 — Using .then() style:
// GET /post/commentsnames/:postId
// Assert status 200 and response has 'comments' property
it('GET commentsnames returns 200 — .then() style', () => {
  // write your code here — no async, must return the promise

});

// TODO 6 — Assert the create comment response message contains 'successfully'
// using expect.stringContaining inside toMatchObject.
// Hint: expect(res.data).toMatchObject({ message: expect.stringContaining('successfully') })
it('add comment message contains "successfully" (expect.stringContaining)', async () => {
  // write your code here

});

// TODO 7 — Assert that commentId is a string using toBeTypeOf.
// Hint: expect(commentId).toBeTypeOf('string')
// Note: commentId is set in TODO 2 above — run these tests in order.
it('commentId is a string (toBeTypeOf)', () => {
  // write your code here

});
