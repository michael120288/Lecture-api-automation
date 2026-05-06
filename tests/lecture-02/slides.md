---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 1.6rem; }
  code { font-size: 0.9rem; }
  h2 { color: #1a1a2e; }
  blockquote { color: #c0392b; border-left: 4px solid #c0392b; }
---

## Lecture 02 — SignIn: Authentication & Cookies

**Capturing session cookies and chaining authenticated requests**

<!-- note: Lecture 01 only tested errors. Now we test the happy path — correct credentials — and learn to carry the session forward. -->

---

## What Changed from Lecture 01

- Lecture 01: only error paths (wrong credentials)
- Lecture 02: the **happy path** (correct credentials)

Two new things appear on success:
1. A JWT token in `response.data.token`
2. A session cookie in `response.headers['set-cookie']`

<!-- note: Both are needed for all authenticated requests in future lectures. Students who skip this lecture will struggle with every subsequent one. -->

---

## The Cookie Flow

**POST /signin** → `set-cookie: session=eyJ...`

↓ capture `response.headers['set-cookie'][0]`

**GET /currentuser** + `Cookie: session=eyJ...` → `200 + user`

<!-- note: Walk through each arrow. The key insight: Axios does NOT carry cookies automatically between requests. You must grab the header and re-send it manually. -->

---

## Axios Does NOT Auto-Send Cookies

```ts
// WRONG — no cookie, returns 401:
const res = await axios.get(`${BASE_URL}/currentuser`, {
  validateStatus: () => true,
});

// RIGHT — cookie forwarded, returns 200:
const res = await axios.get(`${BASE_URL}/currentuser`, {
  headers: { Cookie: sessionCookie },
  validateStatus: () => true,
});
```

> Without the `Cookie` header, every authenticated endpoint returns 401.

<!-- note: This is the single most important mechanic in this lecture. Browsers auto-send cookies. Axios does not. In tests, auth is explicit — which is actually better for clarity. -->

---

## Capturing the Cookie

```ts
const raw = response.headers['set-cookie'];
// Always an array — multiple cookies possible
const sessionCookie = Array.isArray(raw) ? raw[0] : raw ?? '';
```

Then send it on every subsequent request:

```ts
headers: { Cookie: sessionCookie }
```

**Why is `set-cookie` an array?**
Servers can set multiple cookies in a single response — HTTP parsers collect all of them into an array.
Chatty only sets one (`session`), so we always take index `[0]`.
Accessing `response.headers['set-cookie']` without `[0]` gives you the whole array, not the cookie string.

<!-- note: set-cookie is always an array in Node.js HTTP. Index [0] gets the session cookie. The ternary handles edge cases where axios flattens it to a string. -->

---

## JWT Format Validation

```ts
// Three dot-separated parts:
const parts = token.split('.');
expect(parts).toHaveLength(3);

// Or with regex:
expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
```

> Every JWT starts with `eyJ` — base64 of `{"`.

<!-- note: You don't decode or verify the signature in tests — that's the server's job. You only validate structure: header.payload.signature, all three non-empty. -->

---

## What the Signin Response Looks Like

```json
{
  "token": "eyJhbGci...",
  "user": {
    "_id": "...",
    "username": "Vitestmike"
  }
}
```

- `password` must be **absent** (stripped by server)
- `username` is title-cased (server normalises it)

<!-- note: The password assertion is a security test. If password ever appears in the response, that's a data leak. Test for its absence explicitly with .not.toHaveProperty('password'). -->

---

## afterAll — Guaranteed Cleanup

```ts
afterAll(async () => {
  if (!sessionCookie) return;
  await axios.post(`${BASE_URL}/signout`, {}, {
    headers: { Cookie: sessionCookie },
    validateStatus: () => true,
  });
});
```

- Runs even when tests **fail**
- Signs out active session

<!-- note: Without afterAll, sessions accumulate on the server. On repeated runs you may hit session limits. The guard (if !sessionCookie) prevents a crash when beforeAll itself failed. -->

---

## Test Lifecycle

`beforeAll` → sign in → capture `sessionCookie`

↓ tests run (1, 2 ... N)

`afterAll` → POST `/signout` → session cleared

<!-- note: This lifecycle pattern appears in every remaining lecture. beforeAll sets up state, tests assert on it, afterAll tears it down. The tests themselves never do setup or teardown. -->

---

## Prove Auth Works — Both Directions

```ts
// With cookie → 200:
expect(withCookieRes.status).toBe(200);

// Without cookie → 401:
expect(noCookieRes.status).toBe(401);
```

- One positive, one negative — same endpoint

<!-- note: Testing only the happy path isn't enough. You must also prove that removing the cookie actually breaks access. Otherwise you don't know if the auth middleware is even running. -->

---

## 3 Common Mistakes

- Accessing `set-cookie` without index `[0]`
- Sending `Cookie` in the body, not in `headers`
- Asserting `toBe(400)` instead of `expectRejected` on negative tests
- Using `x-test-secret` on error-path tests — bypass is for happy-path setup only

<!-- note: The body vs headers mistake produces a 401 with no error message — confusing to debug. The Cookie must go in the HTTP headers object. The bypass header distinction is important: use it in beforeAll signins, NOT when testing wrong credentials. -->

---

## Homework — 7 TODOs

Open `tests/lecture-02/homework/starter.test.ts`

| TODO | Skill |
|------|-------|
| 1 | Status, message, token, user assertions |
| 2 | JWT format — `split('.')`, `startsWith('eyJ')` |
| 3 | `.not.toHaveProperty('password')` + cookie present |
| 4 | Authenticated GET — cookie unlocks `/currentuser` |
| 5 | `.then()` style — shape with `toMatchObject` |
| 6 | `toMatch` — JWT regex |
| 7 | `expect.stringMatching` — cookie contains `session=` |

**Goal: 7 tests passing**
