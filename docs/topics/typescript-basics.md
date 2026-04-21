# TypeScript Basics for API Testing

## Table of Contents

1. [What TypeScript Adds Over JavaScript](#1-what-typescript-adds-over-javascript)
2. [Type Annotations](#2-type-annotations)
3. [Interfaces](#3-interfaces)
4. [Type Inference](#4-type-inference)
5. [The `!` Definite Assignment Assertion](#5-the--definite-assignment-assertion)
6. [AxiosResponse<T> Generic Type](#6-axiosresponset-generic-type)
7. [Awaited<ReturnType<...>>](#7-awaitedreturntype)
8. [Union Types (string | null)](#8-union-types-string--null)
9. [Optional Chaining (?.)](#9-optional-chaining-)
10. [Nullish Coalescing (??)](#10-nullish-coalescing-)
11. [tsconfig.json Key Settings](#11-tsconfigjson-key-settings)
12. [Common TypeScript Errors in This Course](#12-common-typescript-errors-in-this-course)
13. [Related Topics](#related-topics)

---

## 1. What TypeScript Adds Over JavaScript

TypeScript is a *superset* of JavaScript: all valid JavaScript is also valid TypeScript. What TypeScript adds is a static type system — types are checked at compile time (when you run `tsc` or your editor shows errors), not at runtime.

**Why this matters for testing:**

| Problem | JavaScript | TypeScript |
|---------|-----------|-----------|
| Mistyped property name | Silently returns `undefined` at runtime | Error at compile time |
| Wrong argument type | Passes wrong data, fails in unexpected ways | Error at compile time |
| Missing `await` | `response.status` is `undefined` | Type error: `Promise<...>` has no property `status` |
| Accessing `.data` on undefined | Runtime crash | Type error before you run anything |

In this course, TypeScript catches bugs before your tests even run, and it makes your IDE give you accurate autocomplete on `response.data` fields.

---

## 2. Type Annotations

You can annotate variables, function parameters, and return types with a colon followed by the type.

```typescript
// Variable annotation
const baseUrl: string = 'https://api.codeandtest.com/api/v1';
const port: number = 443;
const isSecure: boolean = true;

// Function parameter and return type annotations
function buildUrl(path: string, version: number): string {
  return `https://api.codeandtest.com/api/v${version}/${path}`;
}

// Array type
const allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE'];

// Object type annotation (inline)
const credentials: { username: string; password: string } = {
  username: 'vitestUser123',
  password: 'Pass1234!'
};
```

### Primitive types in TypeScript

| Type | Example |
|------|---------|
| `string` | `'hello'`, `"world"` |
| `number` | `42`, `3.14` |
| `boolean` | `true`, `false` |
| `null` | `null` |
| `undefined` | `undefined` |
| `any` | Disables type checking — avoid in course code |
| `unknown` | Like `any` but safer — must narrow before use |
| `void` | Function returns nothing |
| `never` | Function never returns (throws or loops forever) |

---

## 3. Interfaces

An interface defines the *shape* of an object: what properties it has and what types they are.

```typescript
// Defining a shape for the Chatty user object
interface ChattyUser {
  _id: string;
  username: string;
  email: string;
  avatarColor: string;
  avatarImage: string;
  createdAt: string;
}

// Defining a shape for the signin response body
interface SigninResponse {
  token: string;
  user: ChattyUser;
}

// Using the interface to type a variable
let signinData: SigninResponse;
```

### Interfaces vs. type aliases

Both work for object shapes. In this course, either is fine:

```typescript
// Interface syntax
interface PostPayload {
  post: string;
  bgColor: string;
  privacy: 'Public' | 'Private';
}

// Type alias syntax — equivalent for objects
type PostPayload = {
  post: string;
  bgColor: string;
  privacy: 'Public' | 'Private';
};
```

### Optional properties

Use `?` to mark a property as optional (it may or may not exist):

```typescript
interface CreatePostBody {
  post: string;
  bgColor: string;
  privacy: 'Public' | 'Private';
  gifUrl?: string;    // optional — may be absent
  image?: string;     // optional
  feelings?: string;  // optional
}
```

### Readonly properties

Mark properties that should not be reassigned after construction:

```typescript
interface TestConfig {
  readonly baseUrl: string;  // cannot be changed after object is created
  readonly timeout: number;
}
```

---

## 4. Type Inference

TypeScript can often deduce the type of a variable from its initial value. You do not need to annotate everything.

```typescript
// TypeScript infers: username is string
const username = 'vitestUser123';

// TypeScript infers: statusCode is number
const statusCode = 200;

// TypeScript infers: isAuthenticated is boolean
const isAuthenticated = false;

// TypeScript infers the return type of the function from the return statement
function getBaseUrl() {
  return 'https://api.codeandtest.com/api/v1'; // inferred: string
}
```

### When inference is not enough

TypeScript cannot infer the type of a variable that is declared without an initializer — this is where you need explicit annotations.

```typescript
// TypeScript does not know what this will hold — it infers `any` unless you annotate
let token: string;      // declared but not yet assigned
let authId: string;     // same
let response: AxiosResponse<SigninResponse>;  // will be assigned in beforeAll
```

---

## 5. The `!` Definite Assignment Assertion

When you declare a variable without initializing it and TypeScript's `strictPropertyInitialization` or `strict` mode is on, TypeScript will complain that the variable might not be assigned before use.

The `!` suffix (the *definite assignment assertion*) tells TypeScript: "Trust me, I guarantee this will be assigned before it is used."

```typescript
// Without !  — TypeScript error: Variable 'token' is used before being assigned
let token: string;

beforeAll(async () => {
  const res = await axios.post(`${BASE_URL}/auth/signin`, credentials);
  token = res.data.token;
});

it('uses the token', async () => {
  // TypeScript error here: token may be undefined
  const response = await axios.get(`${BASE_URL}/posts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
});
```

```typescript
// With ! — TypeScript is satisfied
let token!: string;   // "I promise this will be assigned before use"
let authId!: string;

beforeAll(async () => {
  const res = await axios.post(`${BASE_URL}/auth/signin`, credentials,
    { validateStatus: () => true });
  token = res.data.token;
  authId = res.data.user._id;
});

it('uses the token', async () => {
  const response = await axios.get(`${BASE_URL}/posts`, {
    headers: { Authorization: `Bearer ${token}` },  // no error
    validateStatus: () => true
  });
  expect(response.status).toBe(200);
});
```

### Common use case in Chatty course tests

```typescript
describe('Post endpoints', () => {
  let token!: string;
  let authId!: string;
  let postId!: string;

  beforeAll(async () => {
    // token and authId assigned here
  });

  it('creates a post', async () => {
    const res = await createPost(token);
    postId = res.data._id;  // postId assigned here, used in later test
  });

  it('deletes the post', async () => {
    const res = await deletePost(postId, token);  // safe: postId was assigned above
    expect(res.status).toBe(200);
  });
});
```

**Important note:** `!` is a compile-time escape hatch. TypeScript will not verify your claim. If the variable is genuinely unassigned at runtime, you will get a runtime error. Use it only in `beforeAll`/`beforeEach` patterns where you can be confident the assignment happens.

---

## 6. AxiosResponse<T> Generic Type

`AxiosResponse<T>` is a *generic* type from the Axios library. The `T` is a *type parameter* — a placeholder for the type of `response.data`.

```typescript
import { AxiosResponse } from 'axios';

// Without generic: response.data is typed as `any`
const response: AxiosResponse = await axios.post(url, body);
response.data.token;  // TypeScript allows this but provides no type safety

// With generic: response.data is typed as SigninResponse
const response: AxiosResponse<SigninResponse> = await axios.post(url, body);
response.data.token;        // TypeScript knows this is string
response.data.user._id;     // TypeScript knows this exists
response.data.nonexistent;  // TypeScript error: property does not exist
```

### The AxiosResponse shape

```typescript
interface AxiosResponse<T = any> {
  data: T;              // the response body, parsed as JSON
  status: number;       // HTTP status code (200, 201, 400, etc.)
  statusText: string;   // "OK", "Created", "Bad Request", etc.
  headers: object;      // response headers (Set-Cookie, Content-Type, etc.)
  config: object;       // the request config that was used
  request?: any;        // the underlying request object
}
```

### Using generics in practice

```typescript
interface SigninResponseData {
  token: string;
  user: {
    _id: string;
    username: string;
    email: string;
  };
}

// Vitest does not require the generic — use it when you want type safety on .data
const response = await axios.post<SigninResponseData>(
  `${BASE_URL}/auth/signin`,
  { username, password },
  { validateStatus: () => true }
);

// Now TypeScript knows the exact shape of response.data
const token: string = response.data.token;        // string
const userId: string = response.data.user._id;    // string
```

---

## 7. Awaited<ReturnType<...>>

These two utility types are sometimes useful for extracting types from async functions.

### ReturnType<T>

`ReturnType<T>` extracts the return type of a function type `T`.

```typescript
async function signIn(username: string, password: string) {
  const response = await axios.post<SigninResponseData>(
    `${BASE_URL}/auth/signin`,
    { username, password }
  );
  return response.data;
}

// SigninResult is: Promise<SigninResponseData>
type SigninResult = ReturnType<typeof signIn>;
```

### Awaited<T>

`Awaited<T>` unwraps Promises. `Awaited<Promise<string>>` is `string`.

```typescript
// UnwrappedSigninResult is: SigninResponseData
type UnwrappedSigninResult = Awaited<ReturnType<typeof signIn>>;
```

### When you see this in course code

```typescript
// Storing the resolved type of an async helper for reuse
type ProfileData = Awaited<ReturnType<typeof fetchUserProfile>>;

let profile!: ProfileData;

beforeAll(async () => {
  profile = await fetchUserProfile(token);  // TypeScript is satisfied
});
```

---

## 8. Union Types (string | null)

A union type means a value can be one of several types. You write it with `|`.

```typescript
// A cookie value might be a string or null (if the header was not set)
let sessionCookie: string | null = null;

// An authId might not exist if signup failed
let authId: string | undefined;

// A token could be a string or null depending on auth state
type TokenState = string | null;
```

### Working with union types

TypeScript forces you to handle all possibilities before using the value in a type-specific way.

```typescript
let cookie: string | null = extractCookieFromHeaders(response.headers);

// TypeScript error: Object is possibly null
console.log(cookie.toUpperCase());

// CORRECT: narrow the type first
if (cookie !== null) {
  console.log(cookie.toUpperCase()); // TypeScript knows it's string here
}

// Or use optional chaining:
console.log(cookie?.toUpperCase()); // returns undefined if cookie is null
```

### In test setup

```typescript
let authId: string | null = null;

afterAll(async () => {
  if (authId !== null) {
    await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
      headers: { 'x-test-secret': process.env.TEST_SECRET }
    });
  }
});
```

---

## 9. Optional Chaining (?.)

Optional chaining (`?.`) lets you safely access properties on values that might be `null` or `undefined`. If the value to the left of `?.` is `null` or `undefined`, the expression short-circuits and returns `undefined` instead of throwing.

```typescript
// Without optional chaining — throws if response.data is undefined
const userId = response.data.user._id;

// With optional chaining — returns undefined if any part of the chain is nullish
const userId = response?.data?.user?._id;
```

### In test assertions

```typescript
it('returns user data in the response', async () => {
  const response = await axios.post(
    `${BASE_URL}/auth/signin`,
    { username, password },
    { validateStatus: () => true }
  );

  // Safely access nested property for assertion
  expect(response.data?.user?.username).toBe(username);
});
```

### Optional chaining with method calls

```typescript
// Calling a method that might not exist
const upper = response.data?.message?.toUpperCase();

// Calling a function that might be undefined
const result = callbacks?.onSuccess?.();
```

---

## 10. Nullish Coalescing (??)

The `??` operator returns the right-hand side when the left-hand side is `null` or `undefined`. It is different from `||` which triggers on any falsy value (including `0`, `''`, `false`).

```typescript
// ?? only triggers on null/undefined
const timeout = process.env.TEST_TIMEOUT ?? '10000';  // '10000' if env var not set

// || would also trigger on empty string — often not what you want
const baseUrl = process.env.BASE_URL || 'https://api.codeandtest.com/api/v1';
// Problem: if BASE_URL is set to '' (empty string), || gives you the fallback
// ?? would keep the empty string (because '' is not null or undefined)
```

### Common use in test config files

```typescript
// config.ts
export const config = {
  baseUrl: process.env.BASE_URL ?? 'https://api.codeandtest.com/api/v1',
  timeout: Number(process.env.TEST_TIMEOUT ?? '10000'),
  username: process.env.TEST_USERNAME ?? (() => { throw new Error('TEST_USERNAME is required'); })(),
};
```

---

## 11. tsconfig.json Key Settings

The `tsconfig.json` file tells the TypeScript compiler how to behave. Here are the settings relevant to this course.

### Typical course tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Key settings explained

| Setting | Value | What it does |
|---------|-------|-------------|
| `strict` | `true` | Enables all strict checks: `strictNullChecks`, `strictPropertyInitialization`, `noImplicitAny`, etc. This is why `!` assertions are needed |
| `target` | `"ES2022"` | Compiles to modern JavaScript; allows async/await natively |
| `module` | `"NodeNext"` | Uses Node.js ES module resolution |
| `esModuleInterop` | `true` | Allows `import axios from 'axios'` instead of `import * as axios from 'axios'` |
| `types` | `["vitest/globals"]` | Makes `describe`, `it`, `expect`, `beforeAll` available without importing |
| `skipLibCheck` | `true` | Skips type checking of `.d.ts` files in `node_modules`; speeds up compilation |

### What `strict: true` enables

- `strictNullChecks`: `null` and `undefined` are not assignable to other types without explicit handling
- `strictPropertyInitialization`: Class properties must be initialized in the constructor (hence the `!` pattern for test-file let declarations)
- `noImplicitAny`: Variables without a type annotation or inference trigger an error
- `strictFunctionTypes`: Function parameters are checked more strictly

---

## 12. Common TypeScript Errors in This Course

### Error: "Object is possibly undefined"

```
error TS2532: Object is possibly 'undefined'.
```

**Cause:** You accessed a property on a value that TypeScript believes might be `undefined`.

```typescript
// Triggering code:
let token: string | undefined;
const header = `Bearer ${token}`;  // error: token might be undefined

// Fix 1: Use definite assignment assertion
let token!: string;

// Fix 2: Add a null check
if (token !== undefined) {
  const header = `Bearer ${token}`;
}

// Fix 3: Use nullish coalescing
const header = `Bearer ${token ?? ''}`;
```

### Error: "Property does not exist on type"

```
error TS2339: Property 'xyz' does not exist on type 'AxiosResponse<any>'.
```

**Cause:** Accessing `response.xyz` when `xyz` is not a property of `AxiosResponse`.

```typescript
// Triggering code:
const response = await axios.post(url, body);
const token = response.token;  // error: token is not on AxiosResponse

// Fix: Access via .data
const token = response.data.token;
```

### Error: "Argument of type 'string | undefined' is not assignable"

```
error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

**Cause:** `process.env.X` returns `string | undefined` in TypeScript. Passing it directly where `string` is required fails.

```typescript
// Triggering code:
const response = await axios.post(url, {
  username: process.env.TEST_USERNAME,  // error: string | undefined, not string
  password: process.env.TEST_PASSWORD
});

// Fix 1: Use non-null assertion
const response = await axios.post(url, {
  username: process.env.TEST_USERNAME!,
  password: process.env.TEST_PASSWORD!
});

// Fix 2: Validate at startup (preferred — see environment-variables.md)
if (!process.env.TEST_USERNAME) throw new Error('TEST_USERNAME is required');
const username: string = process.env.TEST_USERNAME;
```

### Error: "await expression is only allowed within an async function"

```
error TS1308: 'await' expression is only allowed within an async function.
```

**Cause:** Using `await` in a non-`async` function or at module top level.

```typescript
// Fix: add async keyword
it('tests something', async () => {    // <-- async here
  const response = await axios.get(url);
  expect(response.status).toBe(200);
});
```

### Error: "Cannot find name 'describe' (or 'it', 'expect', 'beforeAll')"

```
error TS2304: Cannot find name 'describe'.
```

**Cause:** The `vitest/globals` types are not in `tsconfig.json`.

```json
// Fix: add to tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

Or import them explicitly in each test file:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
```

### Error: "Type 'Promise<AxiosResponse<any, any>>' has no property 'status'"

**Cause:** Forgot `await` on an Axios call.

```typescript
// Triggering code:
const response = axios.get(url);  // missing await — response is a Promise
expect(response.status).toBe(200);  // error

// Fix:
const response = await axios.get(url);
expect(response.status).toBe(200);
```

---

## Related Topics

- [Async/Await](async-await.md) — How async functions work; why `await` is needed on Axios calls
- [Axios](axios.md) — The `AxiosResponse<T>` type in practice; request/response shapes
- [Vitest](vitest.md) — `globals: true` in vitest config eliminates import boilerplate; test typing
- [Environment Variables](environment-variables.md) — Why `process.env.X` is `string | undefined` and how to handle it

## Official Documentation

- [TypeScript — Official docs](https://www.typescriptlang.org/docs/)
- [TypeScript — Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript — tsconfig reference](https://www.typescriptlang.org/tsconfig)
- [DefinitelyTyped](https://definitelytyped.org/)
