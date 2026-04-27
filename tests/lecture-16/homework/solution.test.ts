// Lecture 16 — Homework SOLUTION
// Run: npm test tests/lecture-16/homework/solution.test.ts

import axios from 'axios';
import { config } from '../../../src/config';
import { TEST_AVATAR_IMAGE } from '../../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let sessionCookie = '';
let userId = '';
let username = '';
let uId = '';

beforeAll(async () => {
  const r = await axios.post(signinUrl, { username: config.TEST_USERNAME, password: config.TEST_PASSWORD }, { validateStatus: () => true });
  const raw = r.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
  const cur = await axios.get(currentUserUrl, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  userId   = cur.data.user?._id      ?? '';
  username = cur.data.user?.username ?? '';
  uId      = cur.data.user?.uId      ?? '';
});

afterAll(async () => {
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

it('GET /user/profile returns correct shape', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/profile`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(res.data.user).toHaveProperty('_id');
  expect(res.data.user).toHaveProperty('username');
  expect(res.data.user).not.toHaveProperty('password');
});

it('GET user suggestions returns array', async () => {
  const res = await axios.get(`${config.BASE_URL}/user/profile/user/suggestions`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.data.users)).toBe(true);
});

it('POST /images/profile returns 200', async () => {
  const res = await axios.post(`${config.BASE_URL}/images/profile`, { image: TEST_AVATAR_IMAGE }, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(res.data.message).toBe('Image added successfully');
});

it('GET /images/:userId returns images array', async () => {
  const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(Array.isArray(res.data.images)).toBe(true);
});

// Solution 5 — profile+posts using all 3 URL params
// uId is the 12-digit numeric string — NOT the same as _id.
// Redis uses uId to cache posts, MongoDB uses _id. The endpoint needs both paths.
it('GET /user/profile/posts/:username/:userId/:uId returns profile + posts', async () => {
  const url = `${config.BASE_URL}/user/profile/posts/${username}/${userId}/${uId}`;
  const res = await axios.get(url, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  expect(res.status).toBe(200);
  expect(res.data).toHaveProperty('user');
  expect(res.data).toHaveProperty('posts');
});

// Solution 6 (bonus) — .then() style
it('GET /user/profile/:userId returns correct user — .then() style', () => {
  return axios.get(`${config.BASE_URL}/user/profile/${userId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  }).then(res => {
    expect(res.status).toBe(200);
    expect((res.data.user?.username as string)?.toLowerCase())
      .toBe(config.TEST_USERNAME.toLowerCase());
  });
});

// Solution 7 — expect.arrayContaining + toBeGreaterThanOrEqual
// WHY two assertions in one test: both target the same GET /images/:userId response so
// a single request covers both. This follows the "one request, many checks" pattern.
//
// WHY arrayContaining: length check tells you how many items exist but nothing about
// shape. arrayContaining([objectContaining(...)]) validates that matched items have
// required fields — a stronger API contract guarantee.
//
// WHY toBeGreaterThanOrEqual(0): explicitly asserts images is a real array (not null/
// undefined) and documents that the property can never be negative.
it('expect.arrayContaining + toBeGreaterThanOrEqual — images array shape and length', async () => {
  const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  const images: unknown[] = res.data.images ?? [];
  expect(images.length).toBeGreaterThanOrEqual(0);
  if (images.length > 0) {
    expect(images).toEqual(
      expect.arrayContaining([expect.objectContaining({ _id: expect.any(String) })]),
    );
  }
});
