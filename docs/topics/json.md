# JSON

## What is JSON?

JSON (JavaScript Object Notation) is a text format for representing structured data. It was derived from JavaScript object literal syntax but is language-independent — virtually every programming language can parse and generate JSON.

JSON is the universal language of web APIs. Every endpoint in the Chatty API sends and receives JSON. Understanding JSON deeply saves you from hours of debugging parsing errors and unexpected data shapes.

---

## Valid JSON Data Types

JSON supports exactly six data types. Nothing else is valid:

| Type | JSON Example | Notes |
|------|-------------|-------|
| String | `"hello"` | Must use double quotes — single quotes are invalid JSON |
| Number | `42`, `3.14`, `-1` | No distinction between int and float |
| Boolean | `true`, `false` | Always lowercase |
| Null | `null` | Always lowercase |
| Array | `[1, "two", true]` | Ordered, mixed types allowed |
| Object | `{"key": "value"}` | Keys must be strings in double quotes |

There are no additional types. No `undefined`. No functions. No `Date` objects. No `NaN`. No `Infinity`. If your code tries to serialize these, you will get `null`, omission, or a string depending on the serializer.

---

## JSON vs JavaScript Objects

JSON looks like JavaScript object literal syntax but has important differences:

| Difference | JSON | JavaScript |
|-----------|------|-----------|
| Key quoting | Required: `"key"` | Optional: `key` or `"key"` |
| String quotes | Double quotes only | Double, single, or backtick |
| Trailing commas | Invalid | Valid in most contexts |
| Functions | Not supported | Valid values |
| `undefined` | Not a type | Valid value (but JSON.stringify omits it) |
| Comments | Not allowed | Valid (with `//` or `/* */`) |
| `Date` | No native type | `new Date()` is valid |

```javascript
// Valid JavaScript object — NOT valid JSON
const obj = {
  name: 'Alice',    // single quotes: valid in JS, invalid in JSON
  greet: function() { return 'hello'; },  // functions: invalid in JSON
  value: undefined, // undefined: invalid in JSON
};

// Valid JSON
const json = '{"name": "Alice", "active": true, "count": 42}';
```

---

## `JSON.parse()` and `JSON.stringify()`

`JSON.parse()` converts a JSON string into a JavaScript value:

```typescript
const jsonString = '{"message": "User login successfully", "statusCode": 200}';
const obj = JSON.parse(jsonString);

console.log(obj.message);    // 'User login successfully'
console.log(obj.statusCode); // 200
console.log(typeof obj);     // 'object'
```

`JSON.stringify()` converts a JavaScript value into a JSON string:

```typescript
const credentials = {
  username: 'Vitestmike',
  password: 'Vitest@123456',
};

const json = JSON.stringify(credentials);
console.log(json);
// '{"username":"Vitestmike","password":"Vitest@123456"}'

// With formatting
const pretty = JSON.stringify(credentials, null, 2);
console.log(pretty);
// {
//   "username": "Vitestmike",
//   "password": "Vitest@123456"
// }
```

---

## How Axios Automatically Parses JSON Responses

This is one of the most important things to understand early in this course.

When you make a request with Axios and the response has `Content-Type: application/json`, Axios automatically calls `JSON.parse()` on the response body. By the time your code runs, `res.data` is already a JavaScript object — not a string.

```typescript
const res = await axios.post(`${config.BASE_URL}/signin`, credentials, {
  validateStatus: () => true,
});

// res.data is ALREADY a JavaScript object — Axios parsed it for you
console.log(typeof res.data);         // 'object'
console.log(res.data.message);        // 'User login successfully'
console.log(res.data.token);          // 'eyJhbGciOiJIUzI1NiIs...'
console.log(res.data.user.username);  // 'Vitestmike'

// You do NOT need to do this:
const parsed = JSON.parse(res.data);  // ERROR: res.data is already an object
```

If you try to call `JSON.parse(res.data)` when `res.data` is already an object, you will get a `TypeError` or unexpected results.

---

## Content-Type: application/json

When sending JSON in a request body, the client must set the `Content-Type` header to tell the server the body format.

Axios does this automatically when you pass a JavaScript object as the request body:

```typescript
// Axios sets Content-Type: application/json automatically
const res = await axios.post(
  `${config.BASE_URL}/signup`,
  {
    username: 'vitestmike',
    email: 'mike@example.com',
    password: 'Vitest@123456',
    avatarColor: '#4a90e2',
    avatarImage: TEST_AVATAR_IMAGE,
  },
  { validateStatus: () => true },
);
```

If you forget to set `Content-Type` when using `fetch` or `XMLHttpRequest` directly, the server may receive the body as a URL-encoded form or as an empty body — leading to confusing "field required" errors even when your object looks correct.

---

## Navigating Nested Response Data

Real API responses are often deeply nested. You access nested values with dot notation:

### Chatty signin response

```json
{
  "message": "User login successfully",
  "token": "eyJhb...",
  "user": {
    "_id": "661ab12345...",
    "username": "Vitestmike",
    "email": "mike@example.com",
    "avatarColor": "#4a90e2",
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0
  }
}
```

```typescript
const token       = res.data.token;
const userId      = res.data.user._id;
const username    = res.data.user.username;
const postsCount  = res.data.user.postsCount;
```

### Chatty currentuser response

```json
{
  "token": "eyJhb...",
  "isUser": true,
  "user": {
    "_id": "661ab99999...",
    "username": "Vitestmike",
    "notifications": {
      "messages": true,
      "reactions": true,
      "comments": true,
      "follows": true
    }
  }
}
```

```typescript
const isUser             = res.data.isUser;
const reactionsEnabled   = res.data.user.notifications.reactions;
```

### Deep navigation with optional chaining

When a field might be absent (null or undefined), use optional chaining `?.` to avoid runtime errors:

```typescript
// Without optional chaining — crashes if user is null
const reactions = res.data.user.notifications.reactions;  // TypeError if user is null

// With optional chaining — returns undefined if any level is null
const reactions = res.data.user?.notifications?.reactions;
```

---

## Real Chatty API Response Examples

### POST /api/v1/signup (201)

```json
{
  "message": "User created successfully",
  "user": {
    "_id": "661ab99999...",
    "authId": "661ab12345...",
    "username": "Vitestmike",
    "email": "mike@example.com",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://res.cloudinary.com/...",
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0
  }
}
```

### GET /api/v1/currentuser (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isUser": true,
  "user": {
    "_id": "661ab99999...",
    "authId": "661ab12345...",
    "username": "Vitestmike",
    "email": "mike@example.com",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://res.cloudinary.com/...",
    "work": "QA Automation Engineer",
    "school": "",
    "quote": "Quality is not an act, it is a habit",
    "location": "",
    "postsCount": 3,
    "followersCount": 0,
    "followingCount": 0,
    "notifications": {
      "messages": true,
      "reactions": true,
      "comments": true,
      "follows": true
    }
  }
}
```

### Error response (400)

```json
{
  "message": "Invalid credentials",
  "status": "error",
  "statusCode": 400
}
```

---

## Common JSON Errors

These mistakes cause either silent bugs or runtime errors:

**Trailing comma (invalid JSON, valid JS):**

```json
{
  "username": "alice",
  "email": "alice@example.com",   // ← trailing comma — invalid JSON
}
```

`JSON.parse()` will throw `SyntaxError: Unexpected token }`.

**Single quotes (invalid JSON):**

```json
{
  'username': 'alice'   // ← single quotes — invalid JSON
}
```

**undefined (not a JSON type):**

```typescript
const obj = { username: 'alice', password: undefined };
const json = JSON.stringify(obj);
console.log(json); // '{"username":"alice"}' — undefined was silently omitted
```

This can cause hard-to-debug bugs where a field you think you are sending is silently dropped.

**NaN and Infinity:**

```typescript
JSON.stringify({ value: NaN });      // '{"value":null}'
JSON.stringify({ value: Infinity }); // '{"value":null}'
```

Both are converted to `null` in JSON. If your test generates a `NaN` value and passes it to Axios, the server receives `null`.

---

## Vitest Matchers for JSON Responses

```typescript
// Check a field exists
expect(res.data).toHaveProperty('message');

// Check exact value
expect(res.data.message).toBe('User login successfully');

// Check the type of a value
expect(typeof res.data.token).toBe('string');

// Check the entire shape at once
expect(res.data).toMatchObject({
  message: expect.any(String),
  token: expect.any(String),
  user: expect.any(Object),
});

// Check a field is absent
expect(res.data.user).not.toHaveProperty('password');

// Check a nested field
expect(res.data.user.notifications.reactions).toBe(true);
```

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `JSON.parse(res.data)` when Axios already parsed it | `TypeError` or weird results | Access `res.data` directly |
| Accessing `res.data` without `validateStatus: () => true` and request fails | Axios throws before you can read the body | Always use `validateStatus: () => true` |
| Asserting a specific token value | Test breaks on next signin | Assert format, not the exact value |
| Not using optional chaining on deeply nested fields | `TypeError: Cannot read property of null` | Use `?.` for nullable paths |
| Forgetting `await` on an Axios call | `res.data` is a Promise object, not the response | Always `await` Axios calls |
| Sending a JS object with undefined fields | Field silently dropped | Ensure all expected fields have non-undefined values |

---

## Related Topics

- [Base64 Encoding](base64.md)
- [JWT — JSON Web Tokens](jwt.md)
- [MongoDB](mongodb.md)

## Official Documentation

- [JSON.org — Specification](https://www.json.org/json-en.html)
- [MDN — JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [MDN — JSON.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [RFC 8259 — JSON standard](https://datatracker.ietf.org/doc/html/rfc8259)
