// Lecture 02 — SignIn
//
// Endpoint: POST /api/v1/signin
//
// Lecture 1 tested the ERROR path — wrong credentials.
// Lecture 2 tests the HAPPY PATH — successful authentication.
//
// New concepts introduced here:
//   1. Positive test — testing that the correct response is returned for valid input
//   2. JWT token — what it is and how to validate its format
//   3. Session cookie — capturing `set-cookie` response header
//   4. Using the cookie — sending it in subsequent authenticated requests
//   5. afterAll — cleanup by signing out after all tests finish
//
// Prerequisites:
//   TEST_USERNAME and TEST_PASSWORD must be set in .env
//   The account must already exist on the server
//
// Run: npm test tests/lecture-02/lecture.test.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../src/config';
import { expectRejected } from '../../src/test-utils';

const signinUrl = `${config.BASE_URL}/signin`;
const currentUserUrl = `${config.BASE_URL}/currentuser`;
const signoutUrl = `${config.BASE_URL}/signout`;

const credentials = {
  username: config.TEST_USERNAME,
  password: config.TEST_PASSWORD,
};

// ─── File-level shared state ──────────────────────────────────────────────────
//
// ONE signin request shared across all sections.
// The cookie is extracted from the response and reused in section 5.
// afterAll signs out to clean up the session.

let signInResponse!: AxiosResponse;
let sessionCookie: string = '';

beforeAll(async () => {
  signInResponse = await axios.post(signinUrl, credentials, {
    validateStatus: () => true,
  });

  // Extract session cookie from set-cookie header.
  // set-cookie is an array — one string per cookie the server sets.
  // Chatty only sets one cookie (session), so we take index [0].
  const raw = signInResponse.headers['set-cookie'];
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw ?? '');
});

afterAll(async () => {
  // Sign out after all tests — invalidates the session on the server.
  // Always runs even if tests fail — this is the purpose of afterAll.
  if (!sessionCookie) return;

  await axios.post(signoutUrl, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});

// ─── 1. Successful signin — basic ─────────────────────────────────────────────
//
// The most fundamental positive test:
//   - correct credentials → 200 OK
//   - correct message in response body

describe('1. Successful signin — basic', () => {

  it('status is 200', () => {
    expect(signInResponse.status).toBe(200);
  });

  it('message is "User login successfully"', () => {
    expect(signInResponse.data.message).toBe('User login successfully');
  });

  it('response body has the correct top-level shape', () => {
    // Three top-level fields: message, token, user
    expect(signInResponse.data).toMatchObject({
      message: expect.any(String),
      token: expect.any(String),
      user: expect.any(Object),
    });
  });

});

// ─── 2. JWT token ─────────────────────────────────────────────────────────────
//
// The token is a JWT (JSON Web Token) — a signed string that proves identity.
// Structure: header.payload.signature (three base64url parts separated by dots)
//
// We do NOT decode or verify the JWT here (that would require the server's secret).
// Instead we verify its FORMAT — three non-empty parts — which is always testable.

describe('2. JWT token', () => {

  it('token exists in response body', () => {
    expect(signInResponse.data.token).toBeDefined();
  });

  it('token is a non-empty string', () => {
    expect(typeof signInResponse.data.token).toBe('string');
    expect(signInResponse.data.token.length).toBeGreaterThan(0);
  });

  it('token has JWT format — three dot-separated parts', () => {
    const token: string = signInResponse.data.token;
    const parts = token.split('.');

    // A valid JWT always has exactly 3 parts: header.payload.signature
    expect(parts).toHaveLength(3);

    // Each part must be non-empty (base64url encoded data)
    // parts[0] = header, parts[1] = payload, parts[2] = signature
    parts.forEach(part => {
      expect(part.length).toBeGreaterThan(0);
    });
  });

  it('token does not contain spaces (malformed tokens do)', () => {
    // A valid JWT is a compact single string — spaces indicate it is broken
    expect(signInResponse.data.token).not.toContain(' ');
  });

});

// ─── 3. Session cookie ────────────────────────────────────────────────────────
//
// The server sends a session cookie in the `set-cookie` response header.
// The JWT is stored INSIDE this cookie (not sent as a standalone header).
// On the server: req.session = { jwt: userJwt } → cookie-session serialises it.
//
// Why does Chatty use a cookie instead of returning just the token?
// Cookie-based auth is simpler for web apps — the browser handles it automatically.
// The `HttpOnly` flag prevents JavaScript from reading the cookie,
// which protects against XSS attacks.

describe('3. Session cookie', () => {

  it('set-cookie header is present in the response', () => {
    expect(signInResponse.headers['set-cookie']).toBeDefined();
  });

  it('set-cookie header is an array', () => {
    // HTTP parsers collect multiple Set-Cookie headers into an array
    expect(Array.isArray(signInResponse.headers['set-cookie'])).toBe(true);
  });

  it('cookie contains "session="', () => {
    // The cookie-session middleware always names the cookie "session"
    expect(sessionCookie).toContain('session=');
  });

  it('cookie contains HttpOnly directive', () => {
    // HttpOnly means JavaScript cannot read this cookie — XSS protection
    expect(sessionCookie.toLowerCase()).toContain('httponly');
  });

});

// ─── 4. User object ───────────────────────────────────────────────────────────
//
// The signin response includes a `user` object with profile data.
// Key assertions:
//   - Shape matches expected fields
//   - Username matches what we signed in with (normalised to title case)
//   - password is NOT present (server strips it before responding)

describe('4. User object', () => {

  it('user object has expected fields', () => {
    expect(signInResponse.data.user).toMatchObject({
      _id: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
      avatarColor: expect.any(String),
      postsCount: expect.any(Number),
      followersCount: expect.any(Number),
      followingCount: expect.any(Number),
    });
  });

  it('username matches TEST_USERNAME (title case)', () => {
    // Chatty normalises usernames to title case: "vitestmike" → "Vitestmike"
    // We compare case-insensitively to handle this normalisation
    const expected = config.TEST_USERNAME.toLowerCase();
    const received = signInResponse.data.user.username.toLowerCase();
    expect(received).toBe(expected);
  });

  it('password is NOT in the user object', () => {
    // Security assertion — the server must never return the hashed password
    expect(signInResponse.data.user).not.toHaveProperty('password');
  });

  it('user _id is a non-empty string', () => {
    expect(typeof signInResponse.data.user._id).toBe('string');
    expect(signInResponse.data.user._id.length).toBeGreaterThan(0);
  });

  it('postsCount, followersCount, followingCount are non-negative numbers', () => {
    const { postsCount, followersCount, followingCount } = signInResponse.data.user;
    expect(postsCount).toBeGreaterThanOrEqual(0);
    expect(followersCount).toBeGreaterThanOrEqual(0);
    expect(followingCount).toBeGreaterThanOrEqual(0);
  });

});

// ─── 5. Authenticated request — cookie in action ──────────────────────────────
//
// The real proof that signin worked: use the session cookie to call a protected
// endpoint and verify it returns 200 (not 401).
//
// Without the cookie → 401 Unauthorized
// With the cookie    → 200 OK + current user data
//
// This is a CHAIN: signin → extract cookie → authenticated request.
// This pattern is the foundation of all future lectures (L3 onwards).

describe('5. Authenticated request', () => {

  it('GET /currentuser with cookie returns 200', async () => {
    const response = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
  });

  it('GET /currentuser without cookie returns 401', async () => {
    // No cookie header → server cannot authenticate → 401
    const response = await axios.get(currentUserUrl, {
      validateStatus: () => true,
    });

    expect(response.status).toBe(401);
  });

  it('authenticated /currentuser returns the same username as signin', async () => {
    const response = await axios.get(currentUserUrl, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    const currentUsername = response.data.user.username.toLowerCase();
    const signedInUsername = signInResponse.data.user.username.toLowerCase();
    expect(currentUsername).toBe(signedInUsername);
  });

});

// ─── 6. Negative tests ────────────────────────────────────────────────────────
//
// Even though we tested negatives in Lecture 1, here we include the key cases
// to keep each lecture file self-contained and runnable on its own.
// Note: these make individual requests — expectRejected handles 400 OR 429.

describe('6. Negative tests', () => {

  it('wrong password returns 400', async () => {
    const res = await axios.post(
      signinUrl,
      { username: config.TEST_USERNAME, password: 'DefinitelyWrong@999' },
      { validateStatus: () => true },
    );
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toBe('Invalid credentials');
  });

  it('non-existent username returns 400', async () => {
    const res = await axios.post(
      signinUrl,
      { username: 'thisdoesnotexist99999', password: 'SomePass@123' },
      { validateStatus: () => true },
    );
    expectRejected(res.status);
    if (res.status === 400) expect(res.data.message).toBe('Invalid credentials');
  });

  it('missing password returns 400', async () => {
    const res = await axios.post(
      signinUrl,
      { username: config.TEST_USERNAME },
      { validateStatus: () => true },
    );
    expectRejected(res.status);
  });

});

// ─── 7. Response time ─────────────────────────────────────────────────────────

describe('7. Response time', () => {

  it('signin responds within 3000ms', async () => {
    const start = Date.now();
    await axios.post(signinUrl, credentials, { validateStatus: () => true });
    expect(Date.now() - start).toBeLessThan(3000);
  });

});

// ─── 8. Assertion variants ────────────────────────────────────────────────────
//
// Three assertion types not used elsewhere in this file:
//   toMatch(/regex/)              — assert a string matches a regular expression
//   expect.stringMatching(/regex/) — asymmetric regex matcher, usable inside toMatchObject
//   toBeGreaterThanOrEqual(n)      — range check, useful for length or count fields
//
// All read from signInResponse — no extra HTTP call.

describe('8. Assertion variants', () => {

  it('token matches JWT regex pattern — toMatch', () => {
    // A JWT is exactly three base64url segments joined by dots.
    // [\w-]+ matches base64url characters (letters, digits, _, -).
    // toMatch tests the full token string against this regex.
    expect(signInResponse.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it('session cookie contains "session=" — expect.stringMatching', () => {
    // expect.stringMatching is an asymmetric matcher — it can be embedded inside
    // toMatchObject or toEqual to match a string field by regex rather than exact value.
    // Here we use it standalone: the cookie must contain the literal "session=".
    expect(sessionCookie).toEqual(expect.stringMatching(/session=/));
  });

  it('token length is at least 10 — toBeGreaterThanOrEqual', () => {
    // toBeGreaterThanOrEqual asserts a numeric lower bound.
    // A real JWT is typically 150–300 chars; ≥10 is a safe minimum sanity check.
    expect(signInResponse.data.token.length).toBeGreaterThanOrEqual(10);
  });

  it('token has at least 3 parts — toBeGreaterThanOrEqual on split length', () => {
    // Splitting a valid JWT on '.' gives exactly 3 parts.
    // toBeGreaterThanOrEqual(3) combined with toHaveLength(3) from section 2
    // shows both exact and lower-bound styles for the same fact.
    const parts = signInResponse.data.token.split('.');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

});
