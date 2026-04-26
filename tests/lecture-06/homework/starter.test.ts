// Lecture 06 — Homework (starter)
// Run: npm test tests/lecture-06/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';

const signinUrl   = `${config.BASE_URL}/signin`;
const postUrl     = `${config.BASE_URL}/post`;
const getAllUrl    = `${config.BASE_URL}/post/all/1`;
const reactionUrl = `${config.BASE_URL}/post/reaction`;
const signoutUrl  = `${config.BASE_URL}/signout`;

let sessionCookie: string = '';
let postId: string = '';
let postOwnerUserId: string = '';
let postDeleted = false;

const ZERO_REACTIONS = { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 };
const POST_CONTENT = `Vitest hw-06 ${Date.now()}`;

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
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
  if (!postDeleted && postId) {
    await axios.delete(`${config.BASE_URL}/post/${postId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
  }
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// TODO 1 — Add 'love' reaction and assert status 200 + message
it('adding love reaction returns 200', async () => {
  // write your code here

});

// TODO 2 — GET /post/reactions/:postId, assert count >= 1 and reactions array is non-empty
it('GET reactions shows at least one reaction', async () => {
  // write your code here

});

// TODO 3 — GET /post/single/reaction/username/:username/:postId
// Use title-cased TEST_USERNAME. Assert status 200 and response has 'reactions' property.
it('GET single reaction by username returns 200', async () => {
  // write your code here

});

// TODO 4 — Remove the 'love' reaction using DELETE with encodeURIComponent
// URL: /post/reaction/:postId/love/<encoded reactions JSON>
// Assert status 200
it('DELETE reaction with encoded URL param returns 200', async () => {
  // Hint: encodeURIComponent(JSON.stringify({ love: 1, like: 0, happy: 0, sad: 0, wow: 0, angry: 0 }))
  // write your code here

});

// TODO 5 — Using .then() style:
// After removing the reaction, GET /post/reactions/:postId
// Assert count is 0
it('GET reactions count is 0 after removal — .then() style', () => {
  // write your code here — no `async`, must return the promise

});

// TODO 6 — POST /post/reaction (add a 'wow' reaction).
// Assert the response message contains 'successfully' using expect.stringContaining.
// Hint: expect(res.data).toMatchObject({ message: expect.stringContaining('successfully') })
it('add reaction message contains "successfully" (expect.stringContaining)', async () => {
  // write your code here

});

// TODO 7 — Assert that the postId variable is of type 'string' using toBeTypeOf.
// Hint: expect(postId).toBeTypeOf('string')
it('postId is a string (toBeTypeOf)', () => {
  // write your code here

});
