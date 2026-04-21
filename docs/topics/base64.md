# Base64 Encoding

## What is Base64?

Base64 is an encoding scheme that converts arbitrary binary data into a string of printable ASCII characters. It takes any sequence of bytes — the bytes of an image file, a PDF, a compiled program, anything — and represents them using only 64 characters from a safe alphabet.

The name comes from the number of distinct characters in the output alphabet: 64.

---

## Why Base64 Exists

Many communication protocols were designed to handle text. Email (SMTP), HTTP headers, and certain database fields are examples of contexts where arbitrary binary bytes would cause problems:

- Null bytes (`0x00`) can terminate strings in C-based systems
- Certain byte values are interpreted as control characters
- Line endings (`\r\n`) have special meaning in some protocols

Base64 solves this by converting binary data into a text representation that only contains printable, ASCII-safe characters. The tradeoff: Base64 output is approximately 33% larger than the original binary.

---

## The Character Set

The standard Base64 alphabet:

```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
a b c d e f g h i j k l m n o p q r s t u v w x y z
0 1 2 3 4 5 6 7 8 9 + / =
```

Total: 26 uppercase + 26 lowercase + 10 digits + `+` + `/` = 64 characters, plus `=` as a padding character.

The `=` sign is used to pad the output to a multiple of 4 characters when the input length is not divisible by 3.

---

## How Base64 Encoding Works

Base64 reads the input 3 bytes at a time (24 bits) and converts each group into 4 Base64 characters (6 bits each):

```
Input bytes:    01001101  01100001  01101110
                ↓ split into 4 groups of 6 bits ↓
6-bit groups:   010011  010110  000101  101110
Decimal values: 19      22      5       46
Base64 chars:   T       W       F       u
```

For the string `"Man"`:
```
M = 0x4D = 01001101
a = 0x61 = 01100001
n = 0x6E = 01101110

Combined 24 bits: 010011 010110 000101 101110
Base64:           T      W      F      u
Result: "TWFu"
```

---

## Base64URL: The JWT Variant

Standard Base64 uses `+` and `/`. These characters have special meaning in URLs — `+` means space, `/` is a path separator. This makes standard Base64 unsafe to use directly in URLs or HTTP headers.

Base64URL solves this with two substitutions:

| Standard Base64 | Base64URL |
|----------------|-----------|
| `+` | `-` |
| `/` | `_` |
| `=` padding | omitted |

JWTs use Base64URL encoding for their header and payload. This is why JWT parts look slightly different from regular Base64 you might see in email attachments.

---

## Why JWT Headers Always Start with `eyJ`

The JWT header is a Base64URL-encoded JSON object. All JSON objects begin with `{` (character code 123), and the first key in a JWT header is always `"alg"` making the beginning `{"a`. The Base64URL encoding of `{"` is always `eyJ`:

```
Input bytes:  7B  22   ('{' and '"' in ASCII hex)
6-bit groups: 011110 110010
Base64 chars: e      y
Next byte:    a  (61 hex = 97 decimal)
Partial:      J...
```

The result: every JWT header part begins with `eyJ`, and every JWT payload part (also a JSON object starting with `{`) also begins with `eyJ`.

---

## Data URLs: Base64 for Images

A data URL embeds file content directly inside a URL string. The format is:

```
data:<mediatype>;base64,<base64-encoded-data>
```

Example for a tiny PNG:

```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=
```

Breaking this down:
- `data:` — protocol
- `image/png` — MIME type
- `;base64,` — encoding declaration and separator
- `iVBORw0KGgo...` — the Base64-encoded PNG bytes

---

## The TEST_AVATAR_IMAGE Constant

In `src/fixtures.ts`:

```typescript
export const TEST_AVATAR_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
```

This is a 1x1 black pixel PNG encoded as a Base64 data URL. Let's examine why each design decision was made:

**Why a data URL and not a file path?**

The Chatty API signup endpoint (`POST /api/v1/signup`) accepts the avatar image as a base64 data URL string in the JSON body. The server does not accept multipart file uploads on this endpoint — it expects the image data embedded directly in the JSON.

**Why a valid image and not random base64?**

The server uploads the image to Cloudinary for storage. Cloudinary validates that the received data is a real image. Random base64 characters do not decode to valid image data, so Cloudinary rejects them with an error. The test would fail at the API call itself, not at the assertion.

**Why a 1x1 pixel?**

The smallest possible valid PNG is approximately 68 bytes decoded. A real avatar image might be 50KB. The 1x1 pixel:
- Passes Cloudinary's image validation (it is a real PNG)
- Minimizes bandwidth in tests (68 bytes vs 50,000 bytes)
- Minimizes Cloudinary storage costs (test runs should use minimal storage)
- Is predictable — same bytes every test run

**Why a fixed constant rather than generating one per test?**

Generating a random valid image per test run would require an image library. A fixed constant requires no dependencies and is instant.

---

## How Chatty Processes the Avatar Image

When the server receives `avatarImage: 'data:image/png;base64,...'`:

1. The Express controller extracts the base64 string from the request body
2. It passes the data URL to the Cloudinary SDK
3. Cloudinary decodes the base64, validates it is a real image, stores it, and returns a CDN URL
4. The CDN URL (e.g. `https://res.cloudinary.com/chatty/image/upload/v1234/abc.png`) is stored in MongoDB and Redis

When you subsequently call `GET /currentuser`, the `profilePicture` field contains the Cloudinary CDN URL — not the original base64 string.

---

## `btoa()` and `atob()` in JavaScript

For in-memory Base64 encoding/decoding in the browser and modern Node.js:

```typescript
// Encode a string to Base64 (btoa = "binary to ASCII")
const encoded = btoa('Hello World');
console.log(encoded); // 'SGVsbG8gV29ybGQ='

// Decode Base64 to a string (atob = "ASCII to binary")
const decoded = atob('SGVsbG8gV29ybGQ=');
console.log(decoded); // 'Hello World'
```

Limitations of `btoa()`/`atob()`:
- Only works with Latin-1 characters (byte values 0-255)
- For non-ASCII input, `btoa()` throws `InvalidCharacterError`
- These functions do NOT produce Base64URL (they use `+` and `/`)

---

## `Buffer.from()` in Node.js

Node.js's `Buffer` class handles binary data and Base64 more robustly:

```typescript
// String to Base64
const encoded = Buffer.from('Hello World', 'utf8').toString('base64');
console.log(encoded); // 'SGVsbG8gV29ybGQ='

// Base64 to string
const decoded = Buffer.from('SGVsbG8gV29ybGQ=', 'base64').toString('utf8');
console.log(decoded); // 'Hello World'

// Base64URL to string (handles - and _ characters)
const jwtPayload = 'eyJ1c2VySWQiOiI2NjFhYjEyMzQ1NmMifQ';
const payloadJson = Buffer.from(jwtPayload, 'base64url').toString('utf8');
console.log(payloadJson); // '{"userId":"661ab12345..."}'

// Image bytes from a data URL
const dataUrl = 'data:image/png;base64,iVBORw0KGgo...';
const base64Part = dataUrl.split(',')[1];
const imageBytes = Buffer.from(base64Part, 'base64');
console.log(imageBytes.length); // 68 bytes for the 1x1 PNG
```

`Buffer.from(str, 'base64url')` (Node.js 16+) handles the `-` and `_` characters from Base64URL without manual substitution.

---

## Decoding a JWT Payload

The JWT payload is Base64URL-encoded JSON. You can decode it for inspection (not for authentication — never trust a decoded payload without verifying the signature):

```typescript
function decodeJwtPayload(token: string): Record<string, unknown> {
  const payloadPart = token.split('.')[1];
  // Base64URL → Base64: restore + and / characters, add padding
  const base64 = payloadPart
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=');

  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

// In a test (for inspection only — NOT for auth decisions)
const token = signInResponse.data.token;
const payload = decodeJwtPayload(token);
console.log(payload);
// { userId: '661ab12345...', iat: 1713360000, exp: 1713964800 }
```

Or more concisely in Node.js 16+:

```typescript
function decodeJwtPayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}
```

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Using random base64 as `avatarImage` | Cloudinary rejects it — test fails at signup | Use `TEST_AVATAR_IMAGE` from `fixtures.ts` |
| Sending `avatarImage` without the `data:image/png;base64,` prefix | Server rejects the image | Always include the full data URL prefix |
| Using `btoa()` with non-ASCII characters | `InvalidCharacterError` | Use `Buffer.from(str, 'utf8').toString('base64')` |
| Using standard Base64 (`+` and `/`) in JWT manipulation | JWT signature check fails | Use Base64URL (replace `+` with `-`, `/` with `_`) |
| Trusting a decoded JWT payload without verifying the signature | Security vulnerability | Never make auth decisions based on a client-decoded payload |
| Forgetting the comma after `;base64` in a data URL | Invalid data URL format | Format: `data:image/png;base64,iVBOR...` |

---

## Related Topics

- [JWT — JSON Web Tokens](jwt.md)
- [JSON](json.md)
- [MongoDB](mongodb.md)

## Official Documentation

- [MDN — Base64](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
- [MDN — btoa()](https://developer.mozilla.org/en-US/docs/Web/API/btoa)
- [MDN — Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
