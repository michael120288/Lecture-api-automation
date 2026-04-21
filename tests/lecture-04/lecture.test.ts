// Lecture 04 — Current User, Profile Update & Signout
//
// Endpoints:
//   GET  /api/v1/currentuser
//   GET  /api/v1/session-token
//   PUT  /api/v1/user/profile/basic-info
//   PUT  /api/v1/user/profile/settings
//   POST /api/v1/signout
//
// New concepts:
//   1. The currentuser response shape — token + isUser + user
//   2. State verification — PUT then GET to confirm change persisted
//   3. Chatty's Redis + Queue — why updates are immediately visible
//   4. Restoring state in afterAll — save before, restore after
//   5. Signout invalidates the session — subsequent requests return 401
//
// Run: npm test tests/lecture-04/lecture.test.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../src/config';
import { expectRejected } from '../../src/test-utils';

const signinUrl      = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const sessionTokenUrl = `${config.BASE_URL}/session-token`;
const basicInfoUrl   = `${config.BASE_URL}/user/profile/basic-info`;
const settingsUrl    = `${config.BASE_URL}/user/profile/settings`;
const signoutUrl     = `${config.BASE_URL}/signout`;

const credentials = {
  username: config.TEST_USERNAME,
  password: config.TEST_PASSWORD,
};

// ─── File-level shared state ──────────────────────────────────────────────────

let sessionCookie: string = '';
let signInToken: string = '';

// Values captured before we change them — restored in afterAll
let originalWork: string = '';
let originalQuote: string = '';
let originalReactions: boolean = true;
let originalFollows: boolean = true;

beforeAll(async () => {
  // Sign in
  const loginRes = await axios.post(signinUrl, credentials, {
    validateStatus: () => true,
  });
  const raw = loginRes.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
  signInToken = loginRes.data.token ?? '';

  // Capture current profile state before any test modifies it.
  // The ?? '' / ?? true handles null values for accounts created before these
  // fields were added to the schema.
  const currentRes = await axios.get(currentUserUrl, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
  originalWork      = currentRes.data.user?.work      ?? '';
  originalQuote     = currentRes.data.user?.quote     ?? '';
  originalReactions = currentRes.data.user?.notifications?.reactions ?? true;
  originalFollows   = currentRes.data.user?.notifications?.follows   ?? true;
});

afterAll(async () => {
  // Restore original profile values
  await axios.put(basicInfoUrl,
    { work: originalWork, quote: originalQuote },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );

  // Restore original notification settings
  await axios.put(settingsUrl,
    { reactions: originalReactions, follows: originalFollows },
    { headers: { Cookie: sessionCookie }, validateStatus: () => true },
  );

  // Sign out
  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// ─── 1. Current user ──────────────────────────────────────────────────────────
//
// GET /currentuser is the "who am I?" endpoint.
// It reads from Redis (fast, consistent) and returns the full user document.
// The response has three top-level fields: token, isUser, user.
//
// Note: this is different from the signin response which had: message, token, user

describe('1. Current user', () => {
  let currentUserResponse!: AxiosResponse;

  beforeAll(async () => {
    currentUserResponse = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  });

  it('status is 200', () => {
    expect(currentUserResponse.status).toBe(200);
  });

  it('isUser is true', () => {
    // isUser: true means the session is valid and the user was found
    expect(currentUserResponse.data.isUser).toBe(true);
  });

  it('token is present and is a string', () => {
    expect(typeof currentUserResponse.data.token).toBe('string');
    expect(currentUserResponse.data.token.length).toBeGreaterThan(0);
  });

  it('user object has expected fields', () => {
    expect(currentUserResponse.data.user).toMatchObject({
      _id: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
    });
  });

  it('user object has profile fields (may be empty string)', () => {
    // These fields exist even if empty — their presence confirms the schema
    const user = currentUserResponse.data.user;
    expect(user).toHaveProperty('work');
    expect(user).toHaveProperty('school');
    expect(user).toHaveProperty('quote');
    expect(user).toHaveProperty('location');
  });

  it('notifications object has all four settings', () => {
    expect(currentUserResponse.data.user.notifications).toMatchObject({
      messages: expect.any(Boolean),
      reactions: expect.any(Boolean),
      comments: expect.any(Boolean),
      follows: expect.any(Boolean),
    });
  });

  it('password is NOT in the user object', () => {
    expect(currentUserResponse.data.user).not.toHaveProperty('password');
  });

});

// ─── 2. Session token ─────────────────────────────────────────────────────────
//
// GET /session-token — the simplest endpoint.
// It just extracts the JWT from the current session cookie and returns it.
// Useful for frontends that need the raw JWT for other purposes.

describe('2. Session token', () => {
  let sessionTokenResponse!: AxiosResponse;

  beforeAll(async () => {
    sessionTokenResponse = await axios.get(sessionTokenUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
  });

  it('status is 200', () => {
    expect(sessionTokenResponse.status).toBe(200);
  });

  it('returns an object with a token field', () => {
    expect(sessionTokenResponse.data).toHaveProperty('token');
  });

  it('token is a non-empty string', () => {
    expect(typeof sessionTokenResponse.data.token).toBe('string');
    expect(sessionTokenResponse.data.token.length).toBeGreaterThan(0);
  });

  it('token matches the token from signin', () => {
    // The session-token endpoint reads from req.session.jwt — same JWT as signin
    // This proves the session is consistent across endpoints
    expect(sessionTokenResponse.data.token).toBe(signInToken);
  });

});

// ─── 3. Update basic info ─────────────────────────────────────────────────────
//
// PUT /user/profile/basic-info — all fields are optional.
// The server updates Redis immediately, queues the DB write.
// Returns only { message: "Updated successfully" } — not the updated user.
// To see the changes you must call GET /currentuser (section 4).

describe('3. Update basic info', () => {

  it('status is 200', async () => {
    const res = await axios.put(basicInfoUrl,
      { work: 'Senior QA Engineer', quote: 'Test everything that matters' },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(200);
  });

  it('message is "Updated successfully"', async () => {
    const res = await axios.put(basicInfoUrl,
      { work: 'Senior QA Engineer' },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.data.message).toBe('Updated successfully');
  });

  it('sending empty body also returns 200 (all fields optional)', async () => {
    // This proves the schema has no required fields
    const res = await axios.put(basicInfoUrl, {},
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(200);
  });

});

// ─── 4. State verification ────────────────────────────────────────────────────
//
// This is the most important section of the lecture:
// After calling PUT, we call GET /currentuser to CONFIRM the change was saved.
//
// A 200 from PUT only tells you the server accepted the request.
// It does NOT tell you the data was actually stored.
// The GET verification is the proof.

describe('4. State verification', () => {

  const testWork  = 'QA Automation Engineer';
  const testQuote = 'Quality is not an act, it is a habit';

  beforeAll(async () => {
    // Make the update
    await axios.put(basicInfoUrl,
      { work: testWork, quote: testQuote },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
  });

  it('GET /currentuser reflects the updated work field', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.work).toBe(testWork);
  });

  it('GET /currentuser reflects the updated quote field', async () => {
    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.quote).toBe(testQuote);
  });

});

// ─── 5. Update notification settings ─────────────────────────────────────────
//
// PUT /user/profile/settings — toggles notification preferences.
// All fields are optional booleans.
// The response includes the settings object that was applied.

describe('5. Update notification settings', () => {

  it('status is 200', async () => {
    const res = await axios.put(settingsUrl,
      { reactions: false, follows: false },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.status).toBe(200);
  });

  it('message is correct', async () => {
    const res = await axios.put(settingsUrl,
      { reactions: false },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    expect(res.data.message).toBe('Notification settings updated successfully');
  });

  it('response includes the settings that were applied', async () => {
    const res = await axios.put(settingsUrl,
      { reactions: false, follows: false },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );
    // Unlike basic-info, this response echoes back the settings object
    expect(res.data.settings).toMatchObject({
      reactions: false,
      follows: false,
    });
  });

  it('GET /currentuser reflects updated notification settings', async () => {
    await axios.put(settingsUrl,
      { reactions: false },
      { headers: { Cookie: sessionCookie }, validateStatus: () => true },
    );

    const res = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.data.user.notifications.reactions).toBe(false);
  });

});

// ─── 6. Negative tests ────────────────────────────────────────────────────────
//
// All endpoints in this lecture require authentication.
// Without the session cookie → 401 Unauthorized.

describe('6. Negative tests — no cookie', () => {

  it('GET /currentuser without cookie returns 401', async () => {
    const res = await axios.get(currentUserUrl, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('GET /session-token without cookie returns 401', async () => {
    const res = await axios.get(sessionTokenUrl, { validateStatus: () => true });
    expect(res.status).toBe(401);
  });

  it('PUT /user/profile/basic-info without cookie returns 401', async () => {
    const res = await axios.put(basicInfoUrl,
      { work: 'should not work' },
      { validateStatus: () => true },
    );
    expect(res.status).toBe(401);
  });

});

// ─── 7. Signout ───────────────────────────────────────────────────────────────
//
// POST /signout sets req.session = null on the server.
// The cookie still exists on the client but the server no longer recognises it.
// Any subsequent authenticated request with that cookie returns 401.
//
// Note: afterAll also calls signout — but this test runs BEFORE afterAll.
// We sign out here to test it, then afterAll does cleanup. The second signout
// is harmless (already signed out — returns 200 anyway).

describe('7. Signout', () => {

  it('status is 200', async () => {
    const res = await axios.post(signoutUrl, {}, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
  });

  it('message is "User logout successfully"', async () => {
    // Sign in fresh for this test (previous test signed out)
    const freshLogin = await axios.post(signinUrl, credentials, { validateStatus: () => true });
    const freshCookie = freshLogin.headers['set-cookie']?.[0] ?? '';

    const res = await axios.post(signoutUrl, {}, {
      headers: { Cookie: freshCookie },
      validateStatus: () => true,
    });
    expect(res.data.message).toBe('User logout successfully');
  });

  it('after signout the session is invalidated — GET /currentuser returns 401', async () => {
    // Sign in → get cookie → sign out → try currentuser → expect 401
    const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
    const freshCookie = loginRes.headers['set-cookie']?.[0] ?? '';

    await axios.post(signoutUrl, {}, {
      headers: { Cookie: freshCookie }, validateStatus: () => true,
    });

    const afterSignout = await axios.get(currentUserUrl, {
      headers: { Cookie: freshCookie }, validateStatus: () => true,
    });
    expect(afterSignout.status).toBe(401);
  });

});

// ─── 8. Assertion variants ────────────────────────────────────────────────────
//
// Three assertion types not used elsewhere in this file:
//   toBeGreaterThanOrEqual(n)    — lower-bound range check for numeric fields
//   toBeTruthy                   — loose truthiness, any non-empty/non-zero value passes
//   expect.objectContaining({…}) — assert an object contains specific keys/values
//                                  while allowing extra keys
//
// Uses a fresh GET /currentuser response so we have a live user object to inspect.

describe('8. Assertion variants', () => {
  let currentUserRes!: Awaited<ReturnType<typeof axios.get>>;

  beforeAll(async () => {
    // Re-sign in because section 7 signed out
    const loginRes = await axios.post(signinUrl, credentials, { validateStatus: () => true });
    const freshCookie = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie'][0]
      : (loginRes.headers['set-cookie'] ?? '');

    currentUserRes = await axios.get(currentUserUrl, {
      headers: { Cookie: freshCookie },
      validateStatus: () => true,
    });

    // Update sessionCookie so afterAll signout still works
    sessionCookie = freshCookie;
  });

  it('postsCount is non-negative — toBeGreaterThanOrEqual', () => {
    // toBeGreaterThanOrEqual(0) is the correct assertion for "must be zero or more".
    // toBeGreaterThan(0) would fail for a user with no posts.
    expect(currentUserRes.data.user.postsCount).toBeGreaterThanOrEqual(0);
  });

  it('followersCount is non-negative — toBeGreaterThanOrEqual', () => {
    expect(currentUserRes.data.user.followersCount).toBeGreaterThanOrEqual(0);
  });

  it('username is truthy — toBeTruthy', () => {
    // toBeTruthy passes for any non-empty string.
    // Simpler than checking length > 0 when we only care that the field is populated.
    expect(currentUserRes.data.user.username).toBeTruthy();
  });

  it('user object contains core fields — expect.objectContaining', () => {
    // expect.objectContaining checks that the specified keys/values exist.
    // Extra keys in the real object are ignored — this is intentionally partial.
    expect(currentUserRes.data.user).toEqual(expect.objectContaining({
      _id: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
    }));
  });

});
