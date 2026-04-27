// Lecture 04 — Homework SOLUTION
//
// Run: npm test tests/lecture-04/homework/solution.test.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../../src/config';
import { TEST_CLEANUP_SECRET } from '../../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const basicInfoUrl   = `${config.BASE_URL}/user/profile/basic-info`;
const settingsUrl    = `${config.BASE_URL}/user/profile/settings`;
const signoutUrl     = `${config.BASE_URL}/signout`;

let sessionCookie: string = '';
let originalLocation: string = '';
let originalMessages: boolean = true;

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME,
    password: config.TEST_PASSWORD,
  }, { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true });

  const raw = loginRes.headers['set-cookie'];
  
const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');
  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  originalLocation = currentRes.data.user?.location ?? '';
  originalMessages = currentRes.data.user?.notifications?.messages ?? true;
});

afterAll(async () => {
  await axios.put(basicInfoUrl,
    { location: originalLocation },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );
  await axios.put(settingsUrl,
    { messages: originalMessages },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
});

// ─── Solution 1 ───────────────────────────────────────────────────────────────
// Multiple assertions in one test — all verify "this is a valid authenticated response".
// Using async/await with the shared sessionCookie from beforeAll.
it('current user response has correct shape', async () => {
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });

  expect(res.status).toBe(200);
  expect(res.data.isUser).toBe(true);
  expect(res.data.user._id).toBeDefined();
  expect(res.data.user).not.toHaveProperty('password');
});

// ─── Solution 2 ───────────────────────────────────────────────────────────────
// State verification pattern: PUT → GET → assert.
// The PUT returns 200 with a simple message — it does NOT return the updated user.
// Only the subsequent GET proves the data was actually saved.
// Chatty updates Redis immediately, so the GET reads the fresh value right away.
it('PUT /basic-info updates location and GET /currentuser reflects it', async () => {
  await axios.put(basicInfoUrl,
    { location: 'Test City' },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );

  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  const location = res.data.user.location?.replace(/^"|"$/g, '') ?? res.data.user.location;
  expect(location).toBe('Test City');
});

// ─── Solution 3 ───────────────────────────────────────────────────────────────
// Unlike basic-info, the settings endpoint echoes back the applied settings.
// This means you can verify the change from the PUT response itself —
// no need for a follow-up GET (though you could do one for extra confidence).
it('PUT /settings updates messages to false', async () => {
  const res = await axios.put(settingsUrl,
    { messages: false },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );

  expect(res.status).toBe(200);
  expect(res.data.settings.messages).toBe(false);
});

// ─── Solution 4 ───────────────────────────────────────────────────────────────
// Without a cookie, the auth middleware throws NotAuthorizedError → 401.
// No body needed for the PUT since it will be rejected before Joi validation.
it('PUT /basic-info without cookie returns 401', async () => {
  const res = await axios.put(basicInfoUrl,
    { location: 'No Auth City' },
    { validateStatus: () => true },
  );

  expect(res.status).toBe(401);
});

// ─── Solution 5 ───────────────────────────────────────────────────────────────
// .then() style: no `async`, must return the promise.
// Two assertions inside one .then() — both checked on the same response.
it('current user isUser is true and token is string — .then() style', () => {
  return axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  }).then(res => {
    expect(res.data.isUser).toBe(true);
    expect(typeof res.data.token).toBe('string');
  });
});

// ─── Solution 6 ───────────────────────────────────────────────────────────────
// toBeGreaterThanOrEqual(0) asserts a lower bound of zero.
//
// WHY toBeGreaterThanOrEqual(0) instead of toBe(0) or toBeGreaterThan(0)?
// toBe(0) would fail for users who already have posts or followers — too strict.
// toBeGreaterThan(0) would fail for a fresh user with zero posts — also too strict.
// toBeGreaterThanOrEqual(0) is the correct assertion for "non-negative number"
// because it passes for any value ≥ 0 regardless of the actual count.
it('postsCount and followersCount are non-negative — toBeGreaterThanOrEqual', async () => {
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  expect(res.data.user.postsCount).toBeGreaterThanOrEqual(0);
  expect(res.data.user.followersCount).toBeGreaterThanOrEqual(0);
});

// ─── Solution 7 ───────────────────────────────────────────────────────────────
// toBeTruthy() passes for any value that is not: false, 0, '', null, undefined, NaN.
//
// WHY toBeTruthy() instead of .toHaveProperty('username') or length > 0?
// .toHaveProperty only checks existence; a field could exist but be empty string.
// Checking length > 0 requires knowing the type first.
// toBeTruthy() covers both cases in one assertion: the field exists AND is non-empty.
// Use it when you only care that the field is populated, not its exact value.
it('username is truthy — toBeTruthy', async () => {
  const res = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  expect(res.data.user.username).toBeTruthy();
});
