# Lecture 01 — Postman Homework SOLUTION

Read this AFTER you have attempted `postman-tasks.md` yourself.

---

## Solution 1 + 2 + 4 — Wrong credentials (all tests together)

**Request:** `POST {{base_url}}/signin`

**Body:**
```json
{
  "username": "notarealuser99999",
  "password": "WrongPass@9999"
}
```

**Tests tab:**
```js
// Task 1 — status code
pm.test('Status is 400', function () {
  pm.response.to.have.status(400);
});

// Task 1 — message field exists
pm.test('Response has a message field', function () {
  const body = pm.response.json();
  pm.expect(body).to.have.property('message');
});

// Task 1 — status field is "error"
pm.test('Status field is "error"', function () {
  const body = pm.response.json();
  pm.expect(body.status).to.eql('error');
});

// Task 2 — exact message value
pm.test('Message is exactly "Invalid credentials"', function () {
  const body = pm.response.json();
  pm.expect(body.message).to.eql('Invalid credentials');
});

// Task 4 — no token on error
pm.test('Response does not contain a token', function () {
  const body = pm.response.json();
  pm.expect(body).to.not.have.property('token');
});
```

**Why `.to.eql()` and not `.to.equal()`?**
In Chai (which Postman uses), `.eql()` is a deep equality check.
`.equal()` is a strict reference check (`===`).
For string comparison both work the same, but `.eql()` is the Postman convention.

---

## Solution 3 — Empty body

**Request:** `POST {{base_url}}/signin`

**Body:** `{}`

**Tests tab:**
```js
pm.test('Status is 400', function () {
  pm.response.to.have.status(400);
});

pm.test('Response has a message field', function () {
  pm.expect(pm.response.json()).to.have.property('message');
});
```

**Why does `{}` still return 400?**
Joi validates the request body before the controller runs.
An empty body fails the `required()` check on both `username` and `password`.
The server never reaches the database — it rejects the request immediately.

---

## Solution 5 — Username too short

**Request:** `POST {{base_url}}/signin`

**Body:**
```json
{
  "username": "abc",
  "password": "ValidPass@1"
}
```

**Tests tab:**
```js
pm.test('Status is 400', function () {
  pm.response.to.have.status(400);
});

pm.test('Message mentions invalid username', function () {
  const body = pm.response.json();
  pm.expect(body.message).to.include('Invalid username');
});
```

**Why `.to.include()` instead of `.to.eql()`?**
The full message is `"Invalid username"` — but in future schema changes it might
become `"Username must be at least 4 characters"`.
`.to.include()` is more resilient — it passes as long as the substring is present.
`.to.eql()` would fail if the message ever changes wording.
Use `.to.eql()` when the exact wording is important (contract testing).
Use `.to.include()` when you only care about a keyword being present.

---

## Stretch — Collection Runner

After all requests pass individually:

1. Right-click **Lecture 01** folder → **Run folder**
2. Leave iterations at 1, no delays
3. Click **Run Lecture 01**

You should see a green summary: all tests passed.

**What is the Collection Runner used for in real projects?**
- Regression testing before a release
- Running a full test suite on a staging environment
- Generating a test report (export results as JSON or HTML)
