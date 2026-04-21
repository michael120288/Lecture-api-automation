# Lecture 02 — Postman Homework SOLUTION

Read this AFTER you have attempted `postman-tasks.md` yourself.

---

## Solution 1 + 2 + 3 + 4 — Successful signin (all tests together)

**Request:** `POST {{base_url}}/signin`

**Body:**
```json
{
  "username": "{{test_username}}",
  "password": "{{test_password}}"
}
```

**Tests tab:**
```js
// Task 1 — status and message
pm.test('Status is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Message is "User login successfully"', function () {
  pm.expect(pm.response.json().message).to.eql('User login successfully');
});

// Task 1 — token and user exist
pm.test('Response has token and user', function () {
  const body = pm.response.json();
  pm.expect(body).to.have.property('token');
  pm.expect(body).to.have.property('user');
  pm.expect(body.user).to.be.an('object');
});

// Task 2 — token format
pm.test('Token is a string', function () {
  pm.expect(pm.response.json().token).to.be.a('string');
});

pm.test('Token contains dots (JWT format)', function () {
  pm.expect(pm.response.json().token).to.include('.');
});

// Task 3 — password not exposed
pm.test('Password is not in the user object', function () {
  pm.expect(pm.response.json().user).to.not.have.property('password');
});

// Task 4 — set-cookie header
pm.test('Response sets a session cookie', function () {
  pm.expect(pm.response.headers.has('set-cookie')).to.be.true;
});

// Task 3 — save token (not a test, just a script line)
pm.environment.set('token', pm.response.json().token);
```

**Why check `.to.include('.')` for the token?**
A JWT always has the format `header.payload.signature`.
It will always contain at least two dots.
This is a lightweight format check without decoding the token.
A more thorough check would be `token.split('.').length === 3` — but `.to.include('.')`
is sufficient to catch completely broken tokens.

**Why save the token to environment?**
In future requests you can use `{{token}}` in the Authorization header.
Some APIs accept `Bearer {{token}}` — Chatty uses cookies instead, but saving the
token is still useful for debugging (you can decode it at jwt.io to inspect the payload).

---

## Solution 5 — Current User

**Request:** `GET {{base_url}}/currentuser`

**Tests tab:**
```js
pm.test('Status is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response has user object', function () {
  pm.expect(pm.response.json()).to.have.property('user');
});

pm.test('Username matches signed-in user', function () {
  const body = pm.response.json();
  const expected = pm.environment.get('test_username').toLowerCase();
  const received = body.user.username.toLowerCase();
  pm.expect(received).to.eql(expected);
});
```

**Why does this work without explicitly sending the cookie?**
Postman stores cookies in a **Cookie Jar** per domain.
When the signin request received `set-cookie: session=...`, Postman saved it.
When you send any request to the same domain (`api.codeandtest.com`), Postman
automatically includes the cookie in the `Cookie` header.
This mirrors how a browser behaves.

---

## Solution 6 — Signout

**Request:** `POST {{base_url}}/signout`

**Tests tab:**
```js
pm.test('Status is 200', function () {
  pm.response.to.have.status(200);
});
```

**What happens after signout?**
The server clears `req.session` (sets it to null).
The next request to `/currentuser` returns `401 Unauthorized` because
there is no longer a valid session cookie.

If you send **L02 — Current User** again after signout you should see:
```json
Status: 401 Unauthorized
{
  "message": "Token is not valid.Please login again",
  "statusCode": 401,
  "status": "error"
}
```

---

## Stretch — Collection Runner order matters

Running requests in order:
1. **SignIn** → sets the cookie → saves token → returns 200
2. **Current User** → uses cookie → returns 200
3. **SignOut** → invalidates session → returns 200
4. **Current User** → no valid session → returns 401

This is the full **auth lifecycle** in Postman.
The last request returns 401 — if you write a test `pm.response.to.have.status(401)`,
the runner marks it green. The "failure" is the expected result.

This is an important concept: **a test passing does not always mean the server returned success**.
It means the server returned what YOU expected — which might be an error.
