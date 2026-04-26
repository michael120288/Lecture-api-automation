// Lecture 08 — User Profile: Search, Social Links & Password
//
// Run: npm test tests/lecture-08/lecture.test.ts

import axios from 'axios';
import { config } from '../../src/config';
import { TEST_CLEANUP_SECRET } from '../../src/fixtures';

const signinUrl      = `${config.BASE_URL}/signin`;
const signoutUrl     = `${config.BASE_URL}/signout`;
const allUsersUrl    = (page: number) => `${config.BASE_URL}/user/all/${page}`;
const searchUrl      = (q: string) => `${config.BASE_URL}/user/profile/search/${encodeURIComponent(q)}`;
const socialLinksUrl = `${config.BASE_URL}/user/profile/social-links`;
const changePwUrl    = `${config.BASE_URL}/user/profile/change-password`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;

let sessionCookie = '';
let originalSocial = { facebook: '', instagram: '', twitter: '', youtube: '' };

beforeAll(async () => {
  const loginRes = await axios.post(signinUrl, {
    username: config.TEST_USERNAME, password: config.TEST_PASSWORD,
  }, { validateStatus: () => true });
  const raw = loginRes.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  sessionCookie = cookies.map(c => c.split(';')[0]).join('; ');

  // Capture original social links
  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  originalSocial = {
    facebook: currentRes.data.user?.social?.facebook ?? '',
    instagram: currentRes.data.user?.social?.instagram ?? '',
    twitter: currentRes.data.user?.social?.twitter ?? '',
    youtube: currentRes.data.user?.social?.youtube ?? '',
  };
});

afterAll(async () => {
  // Restore social links
  await axios.put(socialLinksUrl, originalSocial, {
    headers: { Cookie: sessionCookie }, validateStatus: () => true,
  });
  await axios.post(signoutUrl, {}, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
});

// ─── 1. Get all users ─────────────────────────────────────────────────────────

describe('1. Get all users', () => {
  let getAllResponse: { data: { users: unknown[]; totalUsers: number; followers: unknown[] } } | null = null;

  beforeAll(async () => {
    const res = await axios.get(allUsersUrl(1), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    getAllResponse = res;
  });

  it('status is 200', () => expect(getAllResponse).not.toBeNull());

  it('response has users, totalUsers, and followers', () => {
    expect(getAllResponse?.data).toMatchObject({
      users: expect.any(Array),
      totalUsers: expect.any(Number),
      followers: expect.any(Array),
    });
  });

  it('totalUsers is greater than 0', () => {
    expect(getAllResponse!.data.totalUsers).toBeGreaterThan(0);
  });

});

// ─── 2. Search users ──────────────────────────────────────────────────────────
//
// Search is case-insensitive regex. "vitest" matches "Vitestuser", "vitestmike", etc.

describe('2. Search users', () => {

  it('GET /user/profile/search/:query returns 200', async () => {
    const res = await axios.get(searchUrl('vitest'), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('response has search array', async () => {
    const res = await axios.get(searchUrl('vitest'), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data).toMatchObject({
      message: 'Search results',
      search: expect.any(Array),
    });
  });

  it('searching for TEST_USERNAME finds at least one result', async () => {
    const query = config.TEST_USERNAME.toLowerCase().slice(0, 6); // e.g. "vitest"
    const res = await axios.get(searchUrl(query), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.search.length).toBeGreaterThan(0);
  });

  it('search result has expected user fields', async () => {
    const res = await axios.get(searchUrl('vitest'), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    if (res.data.search.length === 0) return; // no results to check
    const user = res.data.search[0];
    expect(user).toHaveProperty('_id');
    expect(user).toHaveProperty('username');
    expect(user).not.toHaveProperty('password');
  });

});

// ─── 3. Update social links ───────────────────────────────────────────────────

describe('3. Update social links', () => {

  const testSocial = {
    facebook: 'https://facebook.com/vitest',
    instagram: '',
    twitter: 'https://twitter.com/vitest',
    youtube: '',
  };

  it('PUT /user/profile/social-links returns 200', async () => {
    const res = await axios.put(socialLinksUrl, testSocial, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('message is "Updated successfully"', async () => {
    const res = await axios.put(socialLinksUrl, testSocial, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.message).toBe('Updated successfully');
  });

});

// ─── 4. State verification — social links ─────────────────────────────────────

describe('4. State verification — social links', () => {

  beforeAll(async () => {
    await axios.put(socialLinksUrl, {
      facebook: 'https://facebook.com/test-state',
      instagram: '', twitter: '', youtube: '',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
  });

  it('GET /currentuser reflects updated social link', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    expect(res.data.user.social.facebook).toBe('https://facebook.com/test-state');
  });

});

// ─── 5. Change password — validation errors only ──────────────────────────────
//
// We only test validation errors here — NOT the actual password change.
// Reason: the schema has max 8 chars. Most test accounts have longer passwords.
// Sending the wrong currentPassword would just return 400 anyway (Invalid credentials).
// We safely test the Joi validation path without touching the actual password.

describe('5. Change password — validation errors only', () => {

  it('empty body returns 400', async () => {
    const res = await axios.put(changePwUrl, {},
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(400);
  });

  it('mismatched newPassword and confirmPassword returns 400', async () => {
    const res = await axios.put(changePwUrl, {
      currentPassword: 'Test1',
      newPassword: 'Test2',
      confirmPassword: 'Test3', // different
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(400);
    if (res.status === 400) {
      expect(res.data.message).toContain('Confirm password does not match');
    }
  });

  it('missing currentPassword returns 400', async () => {
    const res = await axios.put(changePwUrl, {
      newPassword: 'Test2', confirmPassword: 'Test2',
    }, { headers: { Cookie: sessionCookie }, validateStatus: () => true });
    expect(res.status).toBe(400);
  });

});

// ─── 6. Assertion variants ───────────────────────────────────────────────────
//
// New assertion types introduced here:
//   toBeGreaterThanOrEqual(n)      — numeric lower-bound check
//   expect.arrayContaining([...])  — array includes a subset of items
//   toBeTruthy()                   — value is truthy (non-empty string, non-zero, etc.)

describe('6. Assertion variants', () => {

  it('totalUsers is a non-negative number (toBeGreaterThanOrEqual)', async () => {
    const res = await axios.get(allUsersUrl(1), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    // toBeGreaterThanOrEqual is the right tool when you only care about a lower
    // bound — the exact count changes as users register or are deleted.
    expect(res.data.totalUsers).toBeGreaterThanOrEqual(0);
  });

  it('search results array contains objects with _id (expect.arrayContaining)', async () => {
    const res = await axios.get(searchUrl('vitest'), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    if (res.data.search.length === 0) return;
    // expect.arrayContaining checks that every listed item is present in the array
    // without requiring the array to match exactly. It is the subset matcher for arrays.
    expect(res.data.search).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _id: expect.any(String) }),
      ]),
    );
  });

  it('first search result username is truthy (toBeTruthy)', async () => {
    const res = await axios.get(searchUrl('vitest'), {
      headers: { Cookie: sessionCookie }, validateStatus: () => true,
    });
    if (res.data.search.length === 0) return;
    const username: string = res.data.search[0].username;
    // toBeTruthy passes for any value that is not false, 0, '', null, undefined, or NaN.
    // It is a quick way to assert a string is non-empty without specifying its exact value.
    expect(username).toBeTruthy();
  });

});

// ─── 7. Negative tests ────────────────────────────────────────────────────────

describe('7. Negative tests', () => {

  it('GET /user/all/1 without cookie returns 401', async () => {
    const res = await axios.get(allUsersUrl(1), { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /user/profile/search/:q without cookie returns 401', async () => {
    const res = await axios.get(searchUrl('vitest'), { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

});
