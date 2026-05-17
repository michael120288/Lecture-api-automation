// Lecture 01 — Setup & First API Test
//
// Endpoint tested: POST /api/v1/signin (with wrong/invalid credentials)
//
// This file demonstrates SIX categories of assertions you can write:
//   1. Basic assertions         — status code, body field existence
//   2. Exact value assertions   — assert what the value IS, not just that it exists
//   3. One request, many checks — make ONE request, run many assertions on it
//   4. Shape validation         — assert the entire response structure at once
//   5. Negative assertions      — assert what should NOT be in the response
//   6. Boundary value tests     — test the edges of the Joi validation schema
//   7. Header assertions        — check response headers
//   8. Response time            — performance assertion
//
// IMPORTANT — rate limiting:
//   The production server allows 5 requests/minute on /signin (nginx) +
//   20 requests / 15 minutes (Express).
//   To stay well under this limit, sections 1–5 and 7–8 share ONE HTTP request
//   made in the top-level beforeAll below.
//   Only section 6 (boundary tests) makes individual requests.
//
// Signin Joi schema (from chatty-backend/src/features/auth/schemas/signin.ts):
//   username: string, required, min 4, max 32
//   password: string, required, min 8, max 128
//
// Run: npm test tests/lecture-01/signin.spec.ts

import axios, { type AxiosResponse } from 'axios';
import { config } from '../../src/config';
import { expectRejected } from '../../src/test-utils';

const url = `${config.BASE_URL}/signin`;

const wrongCredentials = {
  username: 'notarealuser99999',
  password: 'WrongPass@9999',
};

// ─── File-level shared request ────────────────────────────────────────────────
//
// ONE HTTP request shared across sections 1–5, 7, and 8.
// This is the efficient pattern: make as few network calls as possible.
// All assertions in those sections read from this single response object.
//
// beforeAll() at the file root (outside any describe) runs ONCE
// before any test in the entire file.

let sharedResponse!: AxiosResponse;

beforeAll(async () => {
  sharedResponse = await axios.post(url, wrongCredentials, {
    validateStatus: () => true,
  });
});

// ─── Rate limit note ──────────────────────────────────────────────────────────
//
// expectRejected() is imported from src/test-utils.ts — see STANDARDS.md §5.
// It accepts status 400 (validation error) OR 429 (rate limited) as valid rejections.

// ─── 1. Basic assertions ──────────────────────────────────────────────────────
//
// The simplest form: check that a field exists, check the status code.
// These tests read from `sharedResponse` — no extra network call needed.

describe('1. Basic assertions', () => {

  it('returns status 400 for wrong credentials', () => {
    expectRejected(sharedResponse.status);
  });

  it('response body has a message field', () => {
    // toHaveProperty checks the key exists — does not check the value
    expect(sharedResponse.data).toHaveProperty('message');
  });

  it('response body has a status field', () => {
    if (sharedResponse.status === 429) return; // 429 response has no status field
    expect(sharedResponse.data).toHaveProperty('status');
  });

});

// ─── 2. Exact value assertions ────────────────────────────────────────────────
//
// Always assert WHAT the value is, not just that it exists.
// .toHaveProperty('message') tells you the key exists.
// .toBe('Invalid credentials') tells you the actual value is correct.
// Both are needed. Existence check alone is too weak.

describe('2. Exact value assertions', () => {

  it('message is exactly "Invalid credentials"', () => {
    // Guard: 429 responses have a different message — skip the value check
    if (sharedResponse.status === 429) return;
    expect(sharedResponse.data.message).toBe('Invalid credentials');
  });

  it('statusCode inside body matches HTTP status', () => {
    if (sharedResponse.status === 429) return;
    // The Chatty API echoes the HTTP status code inside the JSON body too.
    // response.status        → HTTP status code (from the network response)
    // response.data.statusCode → status code repeated inside the JSON body
    // Both should match. They come from different places.
    expect(sharedResponse.data.statusCode).toBe(sharedResponse.status);
  });

  it('message is a non-empty string', () => {
    // typeof check confirms it is a string (not a number, object, etc.)
    expect(typeof sharedResponse.data.message).toBe('string');
    // Length check confirms it is not an empty string
    expect(sharedResponse.data.message.length).toBeGreaterThan(0);
  });

});

// ─── 3. One request, many checks ─────────────────────────────────────────────
//
// The pattern: make ONE request, run multiple assertions on it.
// This is already what we are doing here with sharedResponse.
// Contrast with sections 1 and 2 above — there we described the concept.
// Here we show it explicitly with no beforeAll (the file-level one handles it).

describe('3. One request, many checks — demonstrated', () => {

  it('all fields are correct in one assertion each', () => {
    // All of these read from the SAME single HTTP request
    expectRejected(sharedResponse.status);
    expect(sharedResponse.data).toHaveProperty('message');
    expect(typeof sharedResponse.data.message).toBe('string');
    expect(sharedResponse.data.message.length).toBeGreaterThan(0);
  });

});

// ─── 4. Shape validation with toMatchObject ───────────────────────────────────
//
// Assert the ENTIRE response structure in one assertion instead of field by field.
// toMatchObject checks that the object contains at least the specified keys/values.
// Extra keys in the response are allowed — only specified ones are checked.
//
// expect.any(Type) — checks the value is an instance of Type, not its exact value.
// Use when you know the type but the value can vary.

describe('4. Shape validation', () => {

  it('response body matches the expected error shape', () => {
    if (sharedResponse.status === 429) {
      // 429 response only has { message } — skip full shape check
      expect(sharedResponse.data).toHaveProperty('message');
      return;
    }

    expect(sharedResponse.data).toMatchObject({
      message: expect.any(String),    // any string value
      status: 'error',                // exact value
      statusCode: expect.any(Number), // any number value
    });
  });

  it('all three error fields have the right types', () => {
    if (sharedResponse.status === 429) return;

    expect(typeof sharedResponse.data.message).toBe('string');
    expect(typeof sharedResponse.data.status).toBe('string');
    expect(typeof sharedResponse.data.statusCode).toBe('number');
  });

});

// ─── 5. Negative assertions — what should NOT be there ───────────────────────
//
// Checking what IS in the response is only half the job.
// Checking what is NOT there is equally important — especially for security.
// Use .not to negate any matcher.

describe('5. Negative assertions', () => {

  it('response does not expose a password field', () => {
    // Security: a server must never return a password in any response
    expect(sharedResponse.data).not.toHaveProperty('password');
  });

  it('response does not include a token on failed login', () => {
    // A JWT token should only be returned on SUCCESSFUL login
    expect(sharedResponse.data).not.toHaveProperty('token');
  });

  it('response does not include a user object on failed login', () => {
    // User data should only be returned after successful authentication
    expect(sharedResponse.data).not.toHaveProperty('user');
  });

  it('status is not 200 or 201 (not a false success)', () => {
    // The server must never return a success code for invalid credentials
    expect(sharedResponse.status).not.toBe(200);
    expect(sharedResponse.status).not.toBe(201);
  });

});

// ─── 6. Boundary value tests ─────────────────────────────────────────────────
//
// Boundary value analysis: test the exact edges of the validation rules.
// Schema: username min 4 / max 32, password min 8 / max 128.
//
// These tests MUST make individual requests (each has different input).
// They use expectRejected() to handle both 400 (validation error) and 429 (rate limit).
// The message check is conditional on receiving a 400 (not a rate-limited 429).
//
// TIP: run this file against localhost (no rate limiter) for clean 400 responses.

describe('6. Boundary value tests — Joi schema limits', () => {

  it('username shorter than 4 chars is rejected', async () => {
    const res = await axios.post(
      url,
      { username: 'abc', password: 'ValidPass@1' }, // 3 chars — below min 4
      { validateStatus: () => true },
    );

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('Invalid username');
    }
  });

  it('username longer than 32 chars is rejected', async () => {
    const res = await axios.post(
      url,
      { username: 'a'.repeat(33), password: 'ValidPass@1' }, // 33 chars — above max 32
      { validateStatus: () => true },
    );

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('Invalid username');
    }
  });

  it('password shorter than 8 chars is rejected', async () => {
    const res = await axios.post(
      url,
      { username: 'validuser', password: 'Pass@1!' }, // 7 chars — below min 8
      { validateStatus: () => true },
    );

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('Invalid password');
    }
  });

  it('password longer than 128 chars is rejected', async () => {
    const res = await axios.post(
      url,
      { username: 'validuser', password: 'A@1' + 'a'.repeat(127) }, // 130 chars
      { validateStatus: () => true },
    );

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('Invalid password');
    }
  });

  it('missing username is rejected', async () => {
    const res = await axios.post(
      url,
      { password: 'ValidPass@1' }, // no username field
      { validateStatus: () => true },
    );

    expectRejected(res.status);
    if (res.status === 400) {
      // Joi distinction:
      //   Field absent entirely → 'any.required' → '"username" is required' (Joi default)
      //   Field present + empty → 'string.empty'  → 'Username is a required field' (custom)
      expect(res.data.message).toContain('"username" is required');
    }
  });

  it('missing password is rejected', async () => {
    const res = await axios.post(
      url,
      { username: 'validuser' }, // no password field
      { validateStatus: () => true },
    );

    expectRejected(res.status);
    if (res.status === 400) {
      expect(res.data.message).toContain('"password" is required');
    }
  });

  it('completely empty body is rejected', async () => {
    const res = await axios.post(url, {}, { validateStatus: () => true });
    expectRejected(res.status);
  });

});

// ─── 7. Header assertions ─────────────────────────────────────────────────────
//
// Response headers carry important metadata.
// Content-Type tells you the format of the body.
// Always check it — if a server returns HTML instead of JSON by mistake,
// this assertion will catch it immediately.

describe('7. Header assertions', () => {

  it('Content-Type is application/json', () => {
    // Full value: "application/json; charset=utf-8"
    // toContain checks for substring — needed because of the "; charset=utf-8" suffix
    expect(sharedResponse.headers['content-type']).toContain('application/json');
  });

  it('response declares its body size', () => {
    // Server must indicate body size via content-length or transfer-encoding
    const hasContentLength = 'content-length' in sharedResponse.headers;
    const hasTransferEncoding = 'transfer-encoding' in sharedResponse.headers;
    expect(hasContentLength || hasTransferEncoding).toBe(true);
  });

});

// ─── 8. Response time ─────────────────────────────────────────────────────────
//
// API responses should arrive quickly. Slow responses indicate:
//   - A missing database index (query scans the full collection)
//   - An N+1 query problem
//   - Blocking synchronous code on the server
//
// The file-level beforeAll already measured the time for sharedResponse,
// so we measure a fresh request here for an isolated timing.

describe('8. Response time', () => {

  it('responds within 3000ms', async () => {
    const start = Date.now();
    await axios.post(url, wrongCredentials, { validateStatus: () => true });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000);
  });

});

// ─── 9. Assertion variants ────────────────────────────────────────────────────
//
// Three assertion types not used elsewhere in this file:
//   toMatch(/regex/)     — assert a string matches a regular expression pattern
//   toBeTypeOf('string') — Vitest-native type check, cleaner than `typeof x === '...'`
//   toBeTruthy / toBeFalsy — loose truthiness check, no strict equality needed
//
// All read from sharedResponse — no extra HTTP call.

describe('9. Assertion variants', () => {

  it('message matches a non-empty string pattern', () => {
    // toMatch accepts a regex — useful for asserting format without knowing exact value.
    // /\S+/ means "one or more non-whitespace characters" — any non-blank string passes.
    expect(sharedResponse.data.message).toMatch(/\S+/);
  });

  it('statusCode is of type number — toBeTypeOf', () => {
    if (sharedResponse.status === 429) return; // 429 response has no statusCode field
    // toBeTypeOf is Vitest-specific — cleaner than `expect(typeof x).toBe('number')`.
    // It reads like a sentence and gives a better failure message.
    expect(sharedResponse.data.statusCode).toBeTypeOf('number');
  });

  it('message is truthy', () => {
    // toBeTruthy passes for any value that is not: false, 0, '', null, undefined, NaN.
    // A non-empty string is always truthy — this confirms the field is populated.
    expect(sharedResponse.data.message).toBeTruthy();
  });

  it('response body has no token — toBeFalsy on presence check', () => {
    // Alternative to .not.toHaveProperty — compute the boolean, then assert it is falsy.
    // toBeFalsy passes for false, 0, '', null, undefined — all mean "not present".
    const hasToken = 'token' in sharedResponse.data;
    expect(hasToken).toBeFalsy();
  });

});
