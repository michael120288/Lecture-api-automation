# Postman

## What Postman Is and Why QA Engineers Use It

Postman is a GUI application for sending HTTP requests, inspecting responses, and organizing API tests into shareable collections. It started as a browser extension in 2012 and is now a standalone desktop application available on macOS, Windows, and Linux.

For QA engineers, Postman solves a core problem: you need a fast, visual way to explore and test an API before writing automated code. When you are starting a new course project or joining a new team, Postman lets you fire off a real request to `https://api.codeandtest.com/api/v1/auth/signin` in under a minute — without writing a single line of TypeScript.

### Why QA engineers specifically reach for Postman

| Use case | Why Postman helps |
|---|---|
| Exploring unknown endpoints | Point-and-click request building, no code required |
| Debugging a failing test | Run the raw request, see the exact response body and headers |
| Manual regression testing | Save requests in a Collection, replay them any time |
| Sharing test scenarios with devs | Export the Collection JSON and attach it to a ticket |
| Generating test scripts | Write `pm.test()` assertions in the Tests tab |
| Feeding data into CI | Export Collection + Environment and run with Newman |

Postman is not a replacement for automated tests in code. It is a companion tool. You explore in Postman, then graduate to Vitest + Axios for the repeatable, version-controlled test suite.

---

## The Postman UI Walkthrough

When you open Postman you see several major areas. Understanding each one up front saves confusion later.

### Sidebar (left panel)

The sidebar has three main sections:

- **Collections** — groups of saved requests organized in folders
- **Environments** — sets of variables (like `BASE_URL`, `token`) scoped to a context (local, staging, production)
- **History** — every request you have sent, in reverse chronological order

### Request builder (center panel)

This is where you build a single request. It has tabs:

| Tab | Purpose |
|---|---|
| Params | Query string parameters appended to the URL |
| Authorization | Auth type selector (Bearer token, Basic, API Key, etc.) |
| Headers | Request headers (Content-Type, x-test-secret, etc.) |
| Body | Request body for POST/PUT/PATCH (raw JSON, form-data, etc.) |
| Pre-request Script | JavaScript that runs before the request fires |
| Tests | JavaScript assertions that run after the response arrives |

### Response viewer (bottom panel)

After you click **Send**, the response appears below:

- **Body** — the response body (Pretty, Raw, Preview tabs)
- **Cookies** — any `Set-Cookie` headers parsed out
- **Headers** — all response headers
- **Test Results** — pass/fail for every `pm.test()` you wrote
- **Status / Time / Size** — e.g. `200 OK  |  213 ms  |  1.45 KB`

### Postman Console

Open with **Cmd+Alt+C** (macOS) or **Ctrl+Alt+C** (Windows/Linux). The Console shows:

- The exact URL that was sent (after variable substitution)
- Request headers that were actually sent
- Response headers
- Any `console.log()` output from your Pre-request or Tests scripts

The Console is your best debugging tool. If a variable like `{{token}}` is not substituting correctly, the Console shows the raw URL that was actually sent.

---

## Creating a Collection and Folder Structure

A **Collection** is a named container for requests. Inside a Collection you can create **folders** to mirror the API's resource structure.

### Recommended folder structure for the Chatty API

```
Chatty API Tests
  Auth
    POST Signup
    POST Signin
    DELETE Signout
  Posts
    GET All Posts
    POST Create Post
    GET Single Post
    PUT Update Post
    DELETE Delete Post
  Comments
    POST Create Comment
    GET Comments for Post
    DELETE Delete Comment
  Reactions
    POST Add Reaction
    DELETE Remove Reaction
```

### How to create a Collection

1. Click **New** (top left) or press **Ctrl+N**
2. Choose **Collection**
3. Give it a name: `Chatty API Tests`
4. Click **Create**

### How to create a folder inside a Collection

1. Click the three-dot menu (`...`) on the Collection name
2. Choose **Add Folder**
3. Name it `Auth`
4. Repeat for `Posts`, `Comments`, `Reactions`

### How to add a request to a folder

1. Right-click a folder
2. Choose **Add Request**
3. Give the request a descriptive name: `POST Signin`

---

## Creating a Request

### Setting the method and URL

The method dropdown (GET, POST, PUT, PATCH, DELETE) sits to the left of the URL bar. Click it to change the method.

For the Chatty signin endpoint:

```
Method: POST
URL:    {{BASE_URL}}/auth/signin
```

The `{{BASE_URL}}` syntax is a variable reference. It will be replaced by the value from your active Environment when the request runs.

### Adding headers

Click the **Headers** tab. For any request that sends a JSON body you need:

| Key | Value |
|---|---|
| `Content-Type` | `application/json` |

For cleanup requests that require the test secret:

| Key | Value |
|---|---|
| `x-test-secret` | `{{TEST_SECRET}}` |

### Adding a request body

Click the **Body** tab, select **raw**, and choose **JSON** from the dropdown on the right.

Signup body:

```json
{
  "username": "vitest_jane_01",
  "email": "vitest_jane_01@example.com",
  "password": "Test1234!",
  "confirmPassword": "Test1234!"
}
```

Signin body:

```json
{
  "username": "vitest_jane_01",
  "password": "Test1234!"
}
```

---

## Environments and Variables

An **Environment** is a named set of key-value pairs. When you have an active Environment, any `{{variableName}}` in your URLs, headers, and body is replaced with the corresponding value before the request fires.

### Creating an Environment for the Chatty course

1. Click the **Environments** icon in the left sidebar (looks like an eye)
2. Click **+** to create a new Environment
3. Name it `Chatty - Local Dev` or `Chatty - Production`

Add these variables:

| Variable | Initial Value | Current Value |
|---|---|---|
| `BASE_URL` | `https://api.codeandtest.com/api/v1` | `https://api.codeandtest.com/api/v1` |
| `token` | (leave empty) | (populated by test script) |
| `cookie` | (leave empty) | (populated by test script) |
| `TEST_SECRET` | your secret value | your secret value |
| `authId` | (leave empty) | (populated by test script) |

**Initial Value** is synced to Postman's cloud if you have an account. **Current Value** is local only. Put secrets in Current Value, never Initial Value.

### Activating an Environment

Use the **Environment dropdown** in the top-right corner of Postman. Select `Chatty - Local Dev`. You will see the eye icon change. Now `{{BASE_URL}}` resolves to `https://api.codeandtest.com/api/v1`.

### Variable scopes

Postman has three scopes, evaluated in this order (most specific wins):

| Scope | Where defined | Lifetime |
|---|---|---|
| **Global** | Globals panel | Persists forever, shared across all collections |
| **Environment** | Environment panel | Active only when that environment is selected |
| **Collection** | Collection > Variables tab | Scoped to that collection only |

For this course, use **Environment** variables. Avoid Globals — they cause confusion when you switch between projects.

---

## Setting Environment Variables from a Response

When you sign in, the server returns a token (or sets a cookie). You need to capture that token and store it in your Environment so later requests can use it.

You do this inside the **Tests** tab using `pm.environment.set()`.

### Example: capture token after signin

Request: `POST {{BASE_URL}}/auth/signin`

Tests tab:

```javascript
// Parse the response body as JSON
const jsonData = pm.response.json();

// Store the token in the active environment
pm.environment.set("token", jsonData.token);

// Store the user's authId for cleanup
pm.environment.set("authId", jsonData.user._id);
```

After this request runs successfully, open the Environment and you will see the `token` and `authId` fields populated with real values. Subsequent requests can then use `{{token}}` in their Authorization or Headers.

### Example: capture a cookie value

If the API sets a session cookie in the response header:

```javascript
// Get the cookie named "session" from the response
const sessionCookie = pm.cookies.get("session");
pm.environment.set("cookie", sessionCookie);
```

### Example: capture from a POST that creates a resource

```javascript
const jsonData = pm.response.json();
pm.environment.set("postId", jsonData.post._id);
```

Now `{{postId}}` is available in all follow-up requests (update post, delete post, add comment).

---

## The Tests Tab and pm.test() Syntax

The Tests tab runs JavaScript after the response is received. Every assertion goes inside a `pm.test()` call.

### Basic structure

```javascript
pm.test("description of what you are checking", function () {
    // assertion goes here
});
```

The first argument is a human-readable description that appears in the Test Results panel. The function body contains one or more assertions. If any assertion throws, the test is marked as **FAIL**.

### Running multiple assertions in one test

```javascript
pm.test("signup response has correct shape", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("message");
    pm.expect(jsonData).to.have.property("user");
    pm.expect(jsonData.user).to.have.property("_id");
});
```

### Running one assertion per test (recommended)

Smaller tests give more useful failure output:

```javascript
pm.test("status is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("response has token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("token");
});
```

---

## Every pm Assertion Used in the Course

### Status code

```javascript
// Assert exact status code
pm.response.to.have.status(200);
pm.response.to.have.status(201);
pm.response.to.have.status(400);
pm.response.to.have.status(401);
pm.response.to.have.status(404);
```

### Response time

```javascript
pm.test("response is fast", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

### Parsing the response body

```javascript
const jsonData = pm.response.json();
```

This parses the response body as JSON. If the body is not valid JSON, this throws and all subsequent assertions fail.

### Property existence

```javascript
pm.expect(jsonData).to.have.property("token");
pm.expect(jsonData).to.have.property("user");
pm.expect(jsonData.user).to.have.property("_id");
pm.expect(jsonData.user).to.have.property("username");
```

### Type checking

```javascript
pm.expect(jsonData.token).to.be.a("string");
pm.expect(jsonData.user._id).to.be.a("string");
pm.expect(jsonData.posts).to.be.an("array");
pm.expect(jsonData.user.followersCount).to.be.a("number");
```

### Value equality

```javascript
pm.expect(jsonData.user.username).to.equal("vitest_jane_01");
pm.expect(jsonData.message).to.equal("User created successfully.");
```

### String contains / includes

```javascript
pm.expect(jsonData.message).to.include("successfully");
pm.expect(jsonData.user.email).to.include("@example.com");
```

### Array length

```javascript
pm.expect(jsonData.posts).to.have.lengthOf(10);
pm.expect(jsonData.posts.length).to.be.above(0);
```

### Nested property deep check

```javascript
pm.expect(jsonData).to.deep.include({
    message: "User signed in successfully."
});
```

### Negation

```javascript
pm.expect(jsonData.user).to.not.have.property("password");
pm.expect(jsonData.token).to.not.be.empty;
```

### Response header checks

```javascript
pm.test("Content-Type is JSON", function () {
    pm.response.to.have.header("Content-Type");
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});
```

---

## Real pm.test() Examples for Chatty API Endpoints

### POST /auth/signup

```javascript
pm.test("status 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("response has user object", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("user");
    pm.expect(jsonData.user).to.have.property("_id");
    pm.expect(jsonData.user).to.have.property("username");
    pm.expect(jsonData.user).to.have.property("email");
});

pm.test("user does not expose password", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user).to.not.have.property("password");
});

// Capture authId for cleanup
const jsonData = pm.response.json();
pm.environment.set("authId", jsonData.user._id);
```

### POST /auth/signin

```javascript
pm.test("status 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("response includes token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("token");
    pm.expect(jsonData.token).to.be.a("string");
    pm.expect(jsonData.token).to.not.be.empty;
});

pm.test("response includes user profile", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.user.username).to.equal("vitest_jane_01");
});

// Capture token for subsequent requests
const jsonData = pm.response.json();
pm.environment.set("token", jsonData.token);
```

### GET /posts (all posts)

```javascript
pm.test("status 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("posts is an array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.posts).to.be.an("array");
});

pm.test("each post has required fields", function () {
    const jsonData = pm.response.json();
    const post = jsonData.posts[0];
    pm.expect(post).to.have.property("_id");
    pm.expect(post).to.have.property("post");
    pm.expect(post).to.have.property("createdAt");
});
```

### POST /post (create post)

```javascript
pm.test("status 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("created post matches sent body", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.post.post).to.include("Hello from Postman");
});

// Capture postId for comment and delete tests
const jsonData = pm.response.json();
pm.environment.set("postId", jsonData.post._id);
```

### POST /comment (add comment to post)

```javascript
pm.test("status 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("comment appears in response", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.comment).to.have.property("_id");
    pm.expect(jsonData.comment.comment).to.be.a("string");
});
```

---

## Pre-request Scripts

Pre-request scripts run before the request is sent. They are useful for:

- Setting a dynamic timestamp variable
- Computing a signature or hash
- Logging context to the Console

```javascript
// Set a unique username each run (prevents duplicate errors)
const timestamp = Date.now();
pm.environment.set("uniqueUser", `vitest_user_${timestamp}`);

// Log something to the Console for debugging
console.log("Running pre-request script. BASE_URL =", pm.environment.get("BASE_URL"));
```

You reference the dynamic variable in your Body:

```json
{
  "username": "{{uniqueUser}}",
  "email": "{{uniqueUser}}@example.com",
  "password": "Test1234!",
  "confirmPassword": "Test1234!"
}
```

---

## Exporting Collections and Environments

You need to export your Collection and Environment to:

- Run tests with [Newman](newman.md)
- Share with teammates
- Commit to the course repository

### Export a Collection

1. Click the three-dot menu (`...`) on the Collection name
2. Choose **Export**
3. Select **Collection v2.1** format
4. Save as `chatty-collection.json`

Always use **v2.1**. Newman and most CI tools expect v2.1.

### Export an Environment

1. Click the **Environments** icon in the sidebar
2. Hover over the environment name
3. Click the three-dot menu (`...`)
4. Choose **Export**
5. Save as `chatty-environment.json`

**Important:** Before exporting, clear any sensitive Current Values (tokens, secrets). The exported file will contain whatever is in Current Value at export time.

---

## The Difference Between Collection, Environment, and Global Variables

| Scope | Where defined | When active | Common use |
|---|---|---|---|
| **Collection** | Collection > Variables tab | Always, for that collection | Base URL shared across all requests in the collection |
| **Environment** | Environments panel | Only when that env is selected | Per-environment config: dev vs prod URLs, test secrets |
| **Global** | Globals panel | Always, all collections | Rarely recommended; use environment instead |

**Resolution order (highest to lowest priority):**

```
Local (inside a script block) > Data (CSV/JSON in Newman) > Environment > Collection > Global
```

If `BASE_URL` is defined both in Collection variables and in the active Environment, the Environment value wins.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| No active environment selected | `{{BASE_URL}}` appears literally in the URL bar | Select an environment from the top-right dropdown |
| Wrong variable name (typo) | Variable is not substituted | Open the Console (Cmd+Alt+C) and check the actual URL sent |
| Saving token to Global instead of Environment | Token bleeds across unrelated collections | Use `pm.environment.set()`, not `pm.globals.set()` |
| `Content-Type: application/json` missing | Server returns 400 or ignores body | Add the header in the Headers tab |
| Exporting Collection v2.0 instead of v2.1 | Newman fails to parse the collection | Re-export and select v2.1 |
| Reading `jsonData.token` when token is nested | `undefined` value stored in variable | Log `jsonData` to the Console and check the actual structure |
| Forgetting to save the request | Changes lost after restart | Press **Ctrl+S** or **Cmd+S** after editing |

---

## Related Topics

- [Newman](newman.md) — run your Postman collection from the terminal and in CI
- [CLI Basics](cli-basics.md) — terminal commands used when running Newman
- [npm Commands](npm-commands.md) — install Newman with npm
- [Git Commands](git-commands.md) — commit and share your exported collection files

## Official Documentation

- [Postman Learning Center](https://learning.postman.com/docs/getting-started/overview/)
- [Postman — Writing tests](https://learning.postman.com/docs/writing-scripts/test-scripts/)
- [Postman — pm API reference](https://learning.postman.com/docs/writing-scripts/script-references/postman-sandbox-api-reference/)
- [Postman — Environments](https://learning.postman.com/docs/sending-requests/managing-environments/)
