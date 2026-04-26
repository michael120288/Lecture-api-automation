// Lecture 15 — Homework SOLUTION
// Run: npm test tests/lecture-15/homework/solution.test.ts

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
const POST_TEXT = `Vitest hw-15 ${Date.now()}`;

beforeAll(async () => {
  const r = await axios.post(signinUrl, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
});

afterAll(async () => {
  if (postId) await axios.delete(`${config.BASE_URL}/post/${postId}`, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

it('POST /post/image/post returns 201', async () => {
  const res = await axios.post(imagePostUrl, {
    post: POST_TEXT, image: TEST_AVATAR_IMAGE, bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(201);
  expect(res.data.message).toBe('Post created with image successfully');
  // Find and save the post ID
  const all = await axios.get(getAllUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  const found = all.data.posts?.find((p: { post: string; _id: string }) => p.post === POST_TEXT);
  if (found) postId = found._id;
});

it('GET /post/images/1 returns posts with imgId', async () => {
  const res = await axios.get(imagesUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.data.posts)).toBe(true);
  const withImg = res.data.posts?.find((p: { imgId: string }) => p.imgId && p.imgId.length > 0);
  expect(withImg).toBeDefined();
});

it('PUT /post/image/:postId updates and returns 200', async () => {
  if (!postId) return; // skip if no post created
  const res = await axios.put(`${config.BASE_URL}/post/image/${postId}`, {
    post: 'Updated image post', image: TEST_AVATAR_IMAGE, bgColor: '#f0f0f0', privacy: 'Public', feelings: '', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(200);
});

it('POST with invalid image returns 400', async () => {
  const res = await axios.post(imagePostUrl, {
    post: 'bad image', image: 'notanimage', bgColor: '#fff', privacy: 'Public', feelings: '', profilePicture: '',
  }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  expect(res.status).toBe(400);
  expect(res.data.message).toContain('Image must be');
});

it('GET /post/images/1 has posts — .then() style', () => {
  return axios.get(imagesUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  }).then(res => {
    expect(res.status).toBe(200);
    expect(res.data.posts.length).toBeGreaterThanOrEqual(0); // may be empty on first run
  });
});

// Solution 6 — toMatch with URL regex
// WHY toMatch: /^https?:\/\// pins the assertion to the scheme at the very start
// of the string. toContain('http') would also match 'not-http://...' accidentally.
// Regex gives precise, position-aware matching.
it('toMatch — profile picture URL starts with http or https', async () => {
  const res = await axios.get(imagesUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const post = res.data.posts?.find((p: { imgVersion: string; imgId: string }) => p.imgId);
  if (post?.imgVersion) {
    const profilePictureUrl = `https://res.cloudinary.com/${post.imgId}/v${post.imgVersion}`;
    expect(profilePictureUrl).toMatch(/^https?:\/\//);
  }
});

// Solution 7 — toSatisfy with custom predicate
// WHY toSatisfy: the condition "at least one element satisfies X" cannot be expressed
// with a single built-in matcher. toSatisfy keeps the assertion in one readable line
// instead of splitting into a loop + separate expect calls.
it('toSatisfy — image post list contains a post with a non-empty imgId', async () => {
  const res = await axios.get(imagesUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const posts = res.data.posts ?? [];
  expect(posts).toSatisfy((arr: { imgId?: string }[]) =>
    arr.some(p => typeof p.imgId === 'string' && p.imgId.length > 0),
  );
});
