// Lecture 15 — Homework (starter)
// Run: npm test tests/lecture-15/homework/starter.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE } from '../../../src/fixtures';

const signinUrl    = `${config.BASE_URL}/signin`;
const signoutUrl   = `${config.BASE_URL}/signout`;
const imagePostUrl = `${config.BASE_URL}/post/image/post`;
const getAllUrl     = `${config.BASE_URL}/post/all/1`;
const imagesUrl    = `${config.BASE_URL}/post/images/1`;

let sessionCookie = '';
let postId = '';

beforeAll(async () => {
  const r = await axios.post(signinUrl, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

afterAll(async () => {
  if (postId) await axios.delete(`${config.BASE_URL}/post/${postId}`, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// TODO 1 — Create an image post. Assert status 201, message "Post created with image successfully".
it('POST /post/image/post returns 201', async () => {
  // write your code here
  // Hint: include TEST_AVATAR_IMAGE as the `image` field
});

// TODO 2 — GET /post/images/1. Assert status 200 and posts array exists.
// Also verify that at least one post has a non-empty `imgId`.
it('GET /post/images/1 returns posts with imgId', async () => {
  // write your code here
});

// TODO 3 — PUT /post/image/:postId to update image post. Assert status 200.
// Hint: you need a postId — create one in TODO 1 and save it somehow, or
// find it in GET /post/all/1 by the post text.
it('PUT /post/image/:postId updates and returns 200', async () => {
  // write your code here
});

// TODO 4 — POST /post/image/post with invalid image string "notanimage". Assert status 400.
it('POST with invalid image returns 400', async () => {
  // write your code here
});

// TODO 5 — .then() style: GET /post/images/1, assert posts array is not empty.
it('GET /post/images/1 has posts — .then() style', () => {
  // write your code here — no async, must return promise
});

// TODO 6 — GET /post/images/1. Find the first post that has an imgVersion field and
// build the full Cloudinary URL: `https://res.cloudinary.com/${post.imgId}/v${post.imgVersion}`.
// Assert the URL starts with http or https using toMatch(/^https?:\/\//).
it('toMatch — profile picture URL starts with http or https', async () => {
  // write your code here
});

// TODO 7 — GET /post/images/1. Assert the posts array satisfies a custom predicate:
// at least one post has a non-empty imgId string.
// Use toSatisfy((arr) => arr.some(...)) — it reads as a single human-friendly statement.
it('toSatisfy — image post list contains a post with a non-empty imgId', async () => {
  // write your code here
});
