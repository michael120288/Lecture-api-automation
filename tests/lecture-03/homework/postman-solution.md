# Lecture 03 — Postman Homework SOLUTION

Read this AFTER you have attempted `postman-tasks.md` yourself.

---

## Solution 1 + 2 — Successful signup (all tests)

**Request:** `POST {{base_url}}/signup`

**Body:**
```json
{
  "username": "vitestpostman01",
  "email": "vitestpostman01@test.com",
  "password": "Vitest@123456",
  "avatarColor": "#4a90e2",
  "avatarImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
}
```

**Tests tab:**
```js
// Task 1 — status
pm.test('Status is 201 Created', function () {
  pm.response.to.have.status(201);
});

// Task 1 — message
pm.test('Message is correct', function () {
  pm.expect(pm.response.json().message).to.eql('User created successfully');
});

// Task 1 — user is an object
pm.test('User is an object', function () {
  pm.expect(pm.response.json().user).to.be.an('object');
});

// Task 1 — password not in response
pm.test('Password is not exposed', function () {
  pm.expect(pm.response.json().user).to.not.have.property('password');
});

// Task 1 — save authId to environment
pm.environment.set('authId', pm.response.json().user.authId);

// Task 2 — token is a string
pm.test('Token is a string', function () {
  pm.expect(pm.response.json().token).to.be.a('string');
});

// Task 2 — token contains a dot
pm.test('Token has JWT format (contains dot)', function () {
  pm.expect(pm.response.json().token).to.include('.');
});
```

**Why `pm.environment.set('authId', ...)` is not inside a `pm.test()`?**
It's a side-effect, not an assertion. The environment variable is set as a script
action, not a test. You can mix `pm.test()` and regular script lines in the Tests tab.
Only `pm.test()` blocks show up in the Test Results panel.

---

## Solution 3 — Duplicate signup

**Request:** Same body (same username + email)

**Tests tab:**
```js
pm.test('Status is 400 for duplicate', function () {
  pm.response.to.have.status(400);
});

pm.test('Message mentions already exists', function () {
  pm.expect(pm.response.json().message).to.include('already');
});
```

**Why does the second request fail even though we sent a valid avatarImage?**
The conflict check runs BEFORE the Cloudinary upload:
1. Joi validates the schema ✓
2. Server queries DB for existing username/email → **found** → throws 400
3. Cloudinary upload never happens

This is why duplicate errors are fast — no external service is called.

---

## Solution 4 — Invalid password

**Request:** `POST {{base_url}}/signup`

**Body:**
```json
{
  "username": "vitestpostman02",
  "email": "vitestpostman02@test.com",
  "password": "NoSpecialChar123",
  "avatarColor": "#4a90e2",
  "avatarImage": "data:image/png;base64,..."
}
```

**Tests tab:**
```js
pm.test('Status is 400 for invalid password', function () {
  pm.response.to.have.status(400);
});

pm.test('Message mentions must contain', function () {
  pm.expect(pm.response.json().message).to.include('must contain');
});
```

**Why does this fail?**
The Joi schema has a `.pattern()` rule:
```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
```
This regex uses lookaheads to require at least one of each character class.
`NoSpecialChar123` passes the length check (12+) but fails the pattern check.
Joi rejects it before the request reaches the controller.

---

## Solution 5 — Cleanup

**Request:** `DELETE {{base_url}}/test/cleanup/user/{{authId}}`

**Header:** `x-test-secret: chatty-test-cleanup-2026`

**Tests tab:**
```js
pm.test('Status is 200 — user deleted', function () {
  pm.response.to.have.status(200);
});

pm.test('Deleted username contains vitest', function () {
  const username = pm.response.json().deletedUsername.toLowerCase();
  pm.expect(username).to.include('vitest');
});
```

---

## Stretch — Lifecycle answer

After the Collection Runner deletes the user in step 3, running **L03 — SignUp success**
again with the same credentials SUCCEEDS with 201.

**Why?** The user was deleted — the database no longer has that username or email.
The uniqueness constraint no longer blocks the signup.

This proves the cleanup endpoint works correctly:
- Before cleanup: duplicate → 400
- After cleanup: signup → 201 (user can be re-created)

This is exactly what happens in automated tests — `beforeAll` creates, `afterAll` deletes,
next test run starts fresh.
