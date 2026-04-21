# URL Encoding

## Table of Contents

1. [What URL Encoding Is and Why It Exists](#1-what-url-encoding-is-and-why-it-exists)
2. [The Percent-Encoding Format](#2-the-percent-encoding-format)
3. [Characters That Must Be Encoded](#3-characters-that-must-be-encoded)
4. [encodeURIComponent() vs encodeURI()](#4-encodeuricomponent-vs-encodeuri)
5. [JSON.stringify() Before Encoding — Why and When](#5-jsonstringify-before-encoding--why-and-when)
6. [The Full Pattern: encodeURIComponent(JSON.stringify(obj))](#6-the-full-pattern-encodeuricomponentjsonstringifyobj)
7. [What the Encoded String Looks Like](#7-what-the-encoded-string-looks-like)
8. [Decoding on the Server Side](#8-decoding-on-the-server-side)
9. [The Chatty Reactions DELETE Endpoint — Full Example](#9-the-chatty-reactions-delete-endpoint--full-example)
10. [Common Mistakes](#10-common-mistakes)
11. [Quick Reference Table](#11-quick-reference-table)
12. [Related Topics](#related-topics)

---

## 1. What URL Encoding Is and Why It Exists

A URL is a string of ASCII characters. The HTTP specification defines a strict subset of characters that are allowed to appear literally in a URL. These are called **unreserved characters**:

```
A-Z  a-z  0-9  -  _  .  ~
```

Everything else must be represented in a different way. This is where **URL encoding** (formally called **percent-encoding**) comes in.

### Why the restriction exists

URLs are transmitted as plain text across the internet. Many characters have special meaning inside a URL:

| Character | Special meaning in URL |
|-----------|------------------------|
| `?` | Starts the query string |
| `&` | Separates query parameters |
| `=` | Separates a key from its value |
| `#` | Starts the fragment (hash) |
| `/` | Separates path segments |
| `+` | Historically represents a space in query strings |
| `:` | Separates protocol from host |

If you tried to include `?` or `&` literally inside a query parameter value, the URL parser on the server would misinterpret it as a delimiter. Percent-encoding removes this ambiguity by replacing the character with a safe representation.

### A simple example

Imagine you want to pass the value `hello world` as a query parameter. The space character is not allowed in a URL. Without encoding:

```
GET /search?term=hello world     ← Invalid URL — space breaks parsing
```

With encoding:

```
GET /search?term=hello%20world   ← Valid — %20 represents a space
```

The server receives `hello%20world`, decodes it back to `hello world`, and processes it correctly.

---

## 2. The Percent-Encoding Format

The encoding format is straightforward:

1. Take the character's byte value in UTF-8.
2. Write a `%` sign.
3. Write the byte value as two uppercase hexadecimal digits.

Examples:

| Character | UTF-8 Byte (hex) | Percent-encoded |
|-----------|------------------|-----------------|
| Space | 0x20 | `%20` |
| `{` | 0x7B | `%7B` |
| `}` | 0x7D | `%7D` |
| `"` | 0x22 | `%22` |
| `:` | 0x3A | `%3A` |
| `,` | 0x2C | `%2C` |
| `[` | 0x5B | `%5B` |
| `]` | 0x5D | `%5D` |
| `@` | 0x40 | `%40` |
| `+` | 0x2B | `%2B` |

Non-ASCII characters (for example, characters with accents, emoji, or characters from other scripts) are encoded by first converting to UTF-8, then percent-encoding each byte:

| Character | UTF-8 Bytes (hex) | Percent-encoded |
|-----------|-------------------|-----------------|
| `é` | 0xC3 0xA9 | `%C3%A9` |
| `€` | 0xE2 0x82 0xAC | `%E2%82%AC` |

---

## 3. Characters That Must Be Encoded

The RFC 3986 specification divides characters into three groups:

**Unreserved — safe to use literally:**
```
A-Z  a-z  0-9  -  _  .  ~
```

**Reserved — have special meaning, must be encoded when used as data:**
```
:  /  ?  #  [  ]  @  !  $  &  '  (  )  *  +  ,  ;  =
```

**Must always be encoded:**
```
space  "  <  >  \  ^  `  {  }  |
```

In practice, when you are passing arbitrary data as a query parameter value, you must encode all characters except `A-Z`, `a-z`, `0-9`, `-`, `_`, `.`, and `~`. This is exactly what `encodeURIComponent()` does.

---

## 4. encodeURIComponent() vs encodeURI()

JavaScript provides two built-in encoding functions. They are not interchangeable.

### encodeURI()

`encodeURI()` is designed to encode a **complete URL**. It deliberately leaves all the structural characters of a URL untouched so they can continue to serve as delimiters.

Characters it does NOT encode (because they are valid URL structure):
```
A-Z  a-z  0-9  -  _  .  ~
;  ,  /  ?  :  @  &  =  +  $  #  !  '  (  )  *
```

```typescript
const url = 'https://api.codeandtest.com/api/v1/search?q=hello world';
encodeURI(url);
// 'https://api.codeandtest.com/api/v1/search?q=hello%20world'
// Only the space was encoded. : / ? = & were all left alone.
```

### encodeURIComponent()

`encodeURIComponent()` is designed to encode a **single value** that will become part of a URL. It encodes everything that is not an unreserved character, including all of the structural characters that `encodeURI()` leaves alone.

Characters it does NOT encode:
```
A-Z  a-z  0-9  -  _  .  ~  !  '  (  )  *
```

Everything else, including `:`, `/`, `?`, `&`, `=`, `{`, `}`, `"`, is encoded.

```typescript
const value = 'hello world & foo=bar';
encodeURIComponent(value);
// 'hello%20world%20%26%20foo%3Dbar'
// Space, &, and = were all encoded.
```

### The critical difference for query parameters

When you put a value inside a query parameter, you must use `encodeURIComponent()`. If you use `encodeURI()`, characters like `&` and `=` will be left unencoded, and the URL parser on the server will interpret them as query string delimiters, breaking your request.

```typescript
const reaction = { type: 'like', postId: '64a2b3c4' };
const asString = JSON.stringify(reaction);
// '{"type":"like","postId":"64a2b3c4"}'

// WRONG — encodeURI() leaves { " : , } unencoded
encodeURI(asString);
// '{"type":"like","postId":"64a2b3c4"}'  ← barely changed, still full of unsafe chars

// CORRECT — encodeURIComponent() encodes all unsafe characters
encodeURIComponent(asString);
// '%7B%22type%22%3A%22like%22%2C%22postId%22%3A%2264a2b3c4%22%7D'
```

### Decision guide

| Situation | Use |
|-----------|-----|
| Encoding an entire URL before navigating to it | `encodeURI()` |
| Encoding a query parameter value | `encodeURIComponent()` |
| Encoding a path segment that might contain slashes | `encodeURIComponent()` |
| Encoding a JSON object to pass as a query param | `encodeURIComponent(JSON.stringify(obj))` |
| Encoding an email address in a query string | `encodeURIComponent()` |

---

## 5. JSON.stringify() Before Encoding — Why and When

`encodeURIComponent()` works on strings. It does not know what to do with JavaScript objects.

```typescript
const reaction = { type: 'like', postId: '64a2b3c4' };

// WRONG — passing an object directly
encodeURIComponent(reaction);
// encodeURIComponent('[object Object]')
// '%5Bobject%20Object%5D'   ← completely wrong
```

Before you can URL-encode a JavaScript object, you must convert it to a string. The correct way to do that for sending structured data is `JSON.stringify()`.

```typescript
const reaction = { type: 'like', postId: '64a2b3c4' };

// Step 1: Convert object to JSON string
const jsonString = JSON.stringify(reaction);
// '{"type":"like","postId":"64a2b3c4"}'

// Step 2: Percent-encode the JSON string
const encoded = encodeURIComponent(jsonString);
// '%7B%22type%22%3A%22like%22%2C%22postId%22%3A%2264a2b3c4%22%7D'
```

### Why this specific combination

The reason the Chatty API uses `encodeURIComponent(JSON.stringify(obj))` as a query parameter encoding strategy is:

1. **JSON preserves the data structure.** A JSON string is a lossless serialization of the object — the server can parse it back to the original object exactly.
2. **JSON uses characters that are unsafe in URLs.** The `{`, `}`, `"`, `:`, and `,` characters all need to be percent-encoded. `JSON.stringify()` creates the string, `encodeURIComponent()` makes it URL-safe.
3. **The server knows how to reverse the process.** Express.js automatically decodes percent-encoded query parameters, and `JSON.parse()` converts the JSON string back to the original object.

---

## 6. The Full Pattern: encodeURIComponent(JSON.stringify(obj))

This is the pattern used in Chatty's reactions DELETE endpoint. Here is what each step does and why:

```typescript
// The data you want to send
const reactionData = { type: 'like', postId: '64a2b3c4d5e6f7890abc1234' };

// Step 1: Serialize the object to a JSON string
// JSON.stringify converts { type: 'like', postId: '...' }
// to the string: '{"type":"like","postId":"64a2b3c4d5e6f7890abc1234"}'
const jsonString = JSON.stringify(reactionData);

// Step 2: Percent-encode the JSON string so it is safe to use in a URL
// encodeURIComponent encodes {, }, ", :, and , — all of which are in the JSON
const encoded = encodeURIComponent(jsonString);
// Result: '%7B%22type%22%3A%22like%22%2C%22postId%22%3A%2264a2b3c4d5e6f7890abc1234%22%7D'

// Step 3: Append it as a query parameter to the URL
const url = `${BASE_URL}/post/reaction?reactionObject=${encoded}`;
```

This can be written as a one-liner:

```typescript
const url = `${BASE_URL}/post/reaction?reactionObject=${encodeURIComponent(JSON.stringify(reactionData))}`;
```

Or using Axios's `params` option, which handles the encoding automatically:

```typescript
// Axios params option encodes values with encodeURIComponent automatically.
// But when the value is an object, you must still stringify it first.
const response = await apiClient.delete('/post/reaction', {
  params: {
    reactionObject: JSON.stringify(reactionData)
    // Axios calls encodeURIComponent() on this string automatically
  },
  headers: { Authorization: `Bearer ${token}` },
  validateStatus: () => true
});
```

When you use Axios `params`, Axios internally calls `encodeURIComponent()` on each value. So if you pass a pre-stringified JSON string, Axios encodes it correctly. If you pass a raw object, Axios will serialize it its own way (not as JSON), which would be wrong for this endpoint.

---

## 7. What the Encoded String Looks Like

Seeing the before and after helps you understand what is happening and debug problems.

### Original object

```typescript
const reactionData = { type: 'like', postId: '64a2b3c4d5e6f7890abc1234' };
```

### After JSON.stringify()

```
{"type":"like","postId":"64a2b3c4d5e6f7890abc1234"}
```

This is a plain string containing `{`, `"`, `:`, `,`, `}` — all of which are unsafe in a URL.

### After encodeURIComponent()

```
%7B%22type%22%3A%22like%22%2C%22postId%22%3A%2264a2b3c4d5e6f7890abc1234%22%7D
```

Character-by-character mapping:

| Original | Encoded |
|----------|---------|
| `{` | `%7B` |
| `"` | `%22` |
| `t` | `t` (unreserved, unchanged) |
| `y` | `y` (unreserved, unchanged) |
| `p` | `p` (unreserved, unchanged) |
| `e` | `e` (unreserved, unchanged) |
| `"` | `%22` |
| `:` | `%3A` |
| `"` | `%22` |
| `l` | `l` (unreserved, unchanged) |
| `i` | `i` (unreserved, unchanged) |
| `k` | `k` (unreserved, unchanged) |
| `e` | `e` (unreserved, unchanged) |
| `"` | `%22` |
| `,` | `%2C` |
| `}` | `%7D` |

### The full URL

```
DELETE /api/v1/post/reaction?reactionObject=%7B%22type%22%3A%22like%22%2C%22postId%22%3A%2264a2b3c4d5e6f7890abc1234%22%7D
```

It looks unreadable to humans, but to an HTTP parser it is unambiguous — there is no confusion about where the query parameter starts or ends.

---

## 8. Decoding on the Server Side

You do not need to decode the query parameter in your tests. Decoding happens automatically on the server before your code ever sees the value.

### How Express.js handles it

When Express receives a request with a percent-encoded query parameter, it automatically calls `decodeURIComponent()` on the value before populating `req.query`. By the time your route handler reads `req.query.reactionObject`, the percent-encoding has already been removed.

```javascript
// Server-side (Express route handler — you do not write this, just read it to understand)
router.delete('/reaction', async (req, res) => {
  // Express has already decoded the query param for us
  const encodedJson = req.query.reactionObject as string;
  // encodedJson is now: '{"type":"like","postId":"64a2b3c4d5e6f7890abc1234"}'
  // The %22, %7B etc. have been decoded back to characters automatically

  // Now parse the JSON string back to an object
  const reactionObject = JSON.parse(encodedJson);
  // reactionObject is now: { type: 'like', postId: '64a2b3c4d5e6f7890abc1234' }
});
```

The full round trip:

```
Client: { type: 'like', postId: '...' }
  → JSON.stringify() →
'{"type":"like","postId":"..."}'
  → encodeURIComponent() →
'%7B%22type%22...'
  → HTTP request →
  → Express decodeURIComponent() (automatic) →
'{"type":"like","postId":"..."}'
  → JSON.parse() →
Server: { type: 'like', postId: '...' }
```

---

## 9. The Chatty Reactions DELETE Endpoint — Full Example

The reactions DELETE endpoint removes a reaction from a post. It accepts the reaction details as a URL-encoded JSON query parameter.

### Endpoint

```
DELETE /api/v1/post/reaction?reactionObject=<encoded>
Authorization: Bearer <token>
```

### Why a DELETE with a query parameter?

HTTP DELETE requests can include a body, but some HTTP servers and proxies strip the body from DELETE requests. Using a query parameter is a safer approach for small amounts of data. The query parameter technique with URL-encoded JSON is how Chatty passes structured data on a DELETE request.

### Full test from Lecture 7

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../src/apiClient';
import { faker } from '@faker-js/faker';

const BASE_URL = process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1';

describe('Reactions — DELETE', () => {
  let token: string;
  let authId: string;
  let postId: string;

  const username = `vitest${faker.internet.username()}`.slice(0, 16).replace(/[^a-zA-Z0-9]/g, 'x');
  const password = 'Vitest@123456!';
  const email = `vitest+${Date.now()}@example.com`;

  beforeAll(async () => {
    // 1. Sign up
    const signupRes = await apiClient.post('/auth/signup', {
      username,
      email,
      password,
      avatarColor: 'blue',
      avatarImage: ''
    });
    expect(signupRes.status).toBe(200);

    // 2. Sign in
    const signinRes = await apiClient.post('/auth/signin', { username, password });
    expect(signinRes.status).toBe(200);
    token = signinRes.data.token;
    authId = signinRes.data.user._id;

    // 3. Create a post
    const postRes = await apiClient.post(
      '/post',
      { post: faker.lorem.sentence(), bgColor: '#ffffff', privacy: 'Public',
        feelings: '', gifUrl: '', image: '', profilePicture: '' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(postRes.status).toBe(201);
    postId = postRes.data._id;

    // 4. Add a reaction to the post (so we have something to remove)
    await apiClient.post(
      '/post/reaction',
      { userTo: authId, postId, type: 'like', postReactions: { like: 1 } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  });

  afterAll(async () => {
    await apiClient.delete(`/test/cleanup/user/${authId}`, {
      headers: { 'x-test-secret': process.env.TEST_SECRET }
    });
  });

  it('removes a reaction from a post using URL-encoded JSON query parameter', async () => {
    // Build the reaction object
    const reactionObject = { type: 'like', postId };

    // Encode it: JSON.stringify first, then encodeURIComponent
    const encodedReaction = encodeURIComponent(JSON.stringify(reactionObject));

    // Make the DELETE request — the encoded param goes in the URL
    const response = await apiClient.delete(
      `/post/reaction?reactionObject=${encodedReaction}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Reaction removed from post');
  });

  it('returns 400 when reactionObject query param is missing', async () => {
    // No reactionObject query parameter at all
    const response = await apiClient.delete('/post/reaction', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(400);
  });

  it('using Axios params option — Axios handles the percent-encoding', async () => {
    // Add the reaction back first
    await apiClient.post(
      '/post/reaction',
      { userTo: authId, postId, type: 'love', postReactions: { love: 1 } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Use params option — Axios calls encodeURIComponent() on the value automatically
    const response = await apiClient.delete('/post/reaction', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        // Must still JSON.stringify because Axios does not know to do that for objects
        reactionObject: JSON.stringify({ type: 'love', postId })
      }
    });

    expect(response.status).toBe(200);
  });
});
```

---

## 10. Common Mistakes

### Mistake 1: Forgetting JSON.stringify() — passing the object directly

```typescript
// WRONG
const encoded = encodeURIComponent({ type: 'like', postId: '64a2b3c4' });
// encodeURIComponent calls .toString() on the object
// Result: '%5Bobject%20Object%5D'
// The server receives '[object Object]' — useless

// CORRECT
const encoded = encodeURIComponent(JSON.stringify({ type: 'like', postId: '64a2b3c4' }));
```

### Mistake 2: Using encodeURI() instead of encodeURIComponent() for query params

```typescript
// WRONG — encodeURI leaves { " : , } unencoded
const encoded = encodeURI(JSON.stringify({ type: 'like', postId: '64a2b3c4' }));
// Result: '{"type":"like","postId":"64a2b3c4"}'
// The curly braces, quotes, colons, and commas are still there
// The server's URL parser may misinterpret them

// CORRECT
const encoded = encodeURIComponent(JSON.stringify({ type: 'like', postId: '64a2b3c4' }));
```

### Mistake 3: Double-encoding

Double-encoding happens when you encode an already-encoded string. This produces `%25xx` instead of `%xx` because `%` itself gets encoded to `%25`.

```typescript
const json = JSON.stringify({ type: 'like', postId: '64a2b3c4' });
const encoded = encodeURIComponent(json);

// WRONG — encoding again
const doubleEncoded = encodeURIComponent(encoded);
// %25 starts appearing — the server will receive literally %7B instead of {
// because %25 decodes to %, giving %7B instead of {

// CORRECT — encode once, not twice
const encoded = encodeURIComponent(json);
// Use `encoded` directly, do not pass it through encodeURIComponent again
```

### Mistake 4: Using Axios params with a raw object (not stringified)

```typescript
// WRONG — Axios does not JSON.stringify automatically for params
const response = await apiClient.delete('/post/reaction', {
  params: {
    reactionObject: { type: 'like', postId }  // raw object
    // Axios will serialize this as "reactionObject[type]=like&reactionObject[postId]=..." 
    // NOT as encoded JSON — completely wrong
  }
});

// CORRECT — stringify first, then let Axios percent-encode
const response = await apiClient.delete('/post/reaction', {
  params: {
    reactionObject: JSON.stringify({ type: 'like', postId })
    // Axios will percent-encode this string correctly
  }
});
```

### Mistake 5: Manually building the query string when using Axios params

```typescript
// WRONG — mixing manual query string construction with Axios params
const response = await apiClient.delete(
  `/post/reaction?reactionObject=${encodedReaction}`,
  {
    params: { someOtherParam: 'value' }  // Axios appends this as a second query string
    // Resulting URL may be malformed if Axios and manual building conflict
  }
);

// CORRECT — use one approach consistently
// Option A: Manual URL construction
const response = await apiClient.delete(
  `/post/reaction?reactionObject=${encodedReaction}`
);

// Option B: Axios params for everything
const response = await apiClient.delete('/post/reaction', {
  params: { reactionObject: JSON.stringify(reactionData) }
});
```

---

## 11. Quick Reference Table

| Step | Code | Purpose |
|------|------|---------|
| 1 | `JSON.stringify(obj)` | Convert object to JSON string |
| 2 | `encodeURIComponent(str)` | Percent-encode all unsafe characters |
| Combined | `encodeURIComponent(JSON.stringify(obj))` | Safe JSON object in a query param |
| Axios params | `params: { key: JSON.stringify(obj) }` | Axios handles percent-encoding, you handle JSON |
| Server decodes | `JSON.parse(req.query.key)` | Express auto-decodes percent-encoding; manual JSON.parse |

| Function | Encodes `{` `}` `"` `:` `,` | Use for |
|----------|------------------------------|---------|
| `encodeURIComponent()` | Yes | Query parameter values |
| `encodeURI()` | No | Complete URLs |

---

## Related Topics

- [Axios](axios.md) — How to make HTTP requests and use the `params` option
- [HTTP Requests](http-requests.md) — DELETE request structure and query parameters
- [JSON](json.md) — JSON.stringify() and JSON.parse() in depth
- [TypeScript Basics](typescript-basics.md) — Typing the reaction object before encoding

## Official Documentation

- [MDN — encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [MDN — URL encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)
- [RFC 3986 — URI syntax](https://datatracker.ietf.org/doc/html/rfc3986)
