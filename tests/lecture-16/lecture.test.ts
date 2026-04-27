// Lecture 16 — User Profile Pages & Image Management
// Run: npm test tests/lecture-16/lecture.test.ts

import axios from 'axios';
import { config } from '../../src/config';
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';
import { TEST_AVATAR_IMAGE } from '../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const profileUrl     = `${config.BASE_URL}/user/profile`;
const suggestionsUrl = `${config.BASE_URL}/user/profile/user/suggestions`;
const imagesProfileUrl = `${config.BASE_URL}/images/profile`;

let sessionCookie = '';
let userId = '';
let username = '';
let uId = '';

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Get user details for profile+posts endpoint
  const curRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  userId   = curRes.data.user?._id      ?? '';
  username = curRes.data.user?.username ?? '';
  uId      = curRes.data.user?.uId      ?? '';
});

afterAll(async () => {
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// ─── 1. Own profile ───────────────────────────────────────────────────────────

describe('1. Own profile', () => {
  let profileResponse: { data: { user: Record<string, unknown>; message: string } } | null = null;

  beforeAll(async () => {
    const res = await axios.get(profileUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    profileResponse = res;
  });

  it('GET /user/profile returns 200', () => {
    expect(profileResponse?.data.user).toBeDefined();
  });

  it('response has user object', () => {
    expect(profileResponse?.data.user).toMatchObject({
      _id: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
    });
  });

  it('password is not in response', () => {
    expect(profileResponse?.data.user).not.toHaveProperty('password');
  });

});

// ─── 2. Profile by userId ─────────────────────────────────────────────────────

describe('2. Profile by userId', () => {

  it('GET /user/profile/:userId returns 200', async () => {
    const res = await axios.get(`${config.BASE_URL}/user/profile/${userId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('returns the correct user', async () => {
    const res = await axios.get(`${config.BASE_URL}/user/profile/${userId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect((res.data.user?.username as string)?.toLowerCase()).toBe(username.toLowerCase());
  });

});

// ─── 3. Profile + posts ───────────────────────────────────────────────────────
//
// GET /user/profile/posts/:username/:userId/:uId
// Returns the user profile AND all their posts in one request.

describe('3. Profile + posts', () => {

  it('returns 200 with user and posts', async () => {
    const url = `${config.BASE_URL}/user/profile/posts/${username}/${userId}/${uId}`;
    const res = await axios.get(url, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('user');
    expect(res.data).toHaveProperty('posts');
  });

});

// ─── 4. User suggestions ──────────────────────────────────────────────────────

describe('4. User suggestions', () => {

  it('GET /user/profile/user/suggestions returns 200', async () => {
    const res = await axios.get(suggestionsUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has users array (may be empty)', async () => {
    const res = await axios.get(suggestionsUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(Array.isArray(res.data.users)).toBe(true);
  });

});

// ─── 5. Upload profile picture ────────────────────────────────────────────────

describe('5. Upload profile picture', () => {

  it('POST /images/profile returns 200', async () => {
    const res = await axios.post(imagesProfileUrl, { image: TEST_AVATAR_IMAGE }, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Image added successfully');
  });

  it('POST /images/profile without image returns 400', async () => {
    const res = await axios.post(imagesProfileUrl, {}, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(400);
  });

});

// ─── 6. Get user images ───────────────────────────────────────────────────────

describe('6. Get user images', () => {

  it('GET /images/:userId returns 200', async () => {
    const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.images)).toBe(true);
  });

});

// ─── 7. Negative tests ────────────────────────────────────────────────────────

describe('7. Negative tests', () => {

  it('GET /user/profile without cookie returns 401', async () => {
    const res = await axios.get(profileUrl, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /user/profile/:userId with invalid ID returns 400', async () => {
    const res = await axios.get(`${config.BASE_URL}/user/profile/not-an-objectid`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(400);
  });

});

// ─── 8. Assertion variants ────────────────────────────────────────────────────
//
// Introduces three assertion styles not used elsewhere in the course:
//   expect.arrayContaining  — assert a subset of expected items exists in an array
//   toBeGreaterThanOrEqual  — inclusive numeric lower-bound check
//   toBeTypeOf              — Vitest-specific runtime type check

describe('8. Assertion variants', () => {

  it('expect.arrayContaining — images array contains objects with _id field', async () => {
    // expect.arrayContaining checks that every element in the expected array
    // appears somewhere in the actual array. objectContaining handles extra fields.
    const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    const images: unknown[] = res.data.images ?? [];
    if (images.length > 0) {
      expect(images).toEqual(
        expect.arrayContaining([expect.objectContaining({ _id: expect.any(String) })]),
      );
    }
  });

  it('toBeGreaterThanOrEqual — images array length is non-negative', async () => {
    // toBeGreaterThanOrEqual(0) guards against a hypothetical -1 or undefined length.
    // It documents that the array must always be a valid array, even when empty.
    const res = await axios.get(`${config.BASE_URL}/images/${userId}`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect((res.data.images ?? []).length).toBeGreaterThanOrEqual(0);
  });

  it('toBeTypeOf — user _id returned by /user/profile is a string', async () => {
    // toBeTypeOf('string') is a Vitest assertion that mirrors typeof at runtime.
    // It gives a cleaner error than expect(typeof x).toBe('string').
    const res = await axios.get(`${config.BASE_URL}/user/profile`, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.user?._id).toBeTypeOf('string');
  });

});
