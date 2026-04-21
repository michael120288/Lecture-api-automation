# Lecture 02 — Postman Homework

Complete these tasks in Postman before looking at `postman-solution.md`.

Create all requests inside a folder named **Lecture 02** in your **Chatty API** collection.

---

## Task 1 — Successful signin shape

Create a request named **L02 — SignIn success**.

- Method: `POST`
- URL: `{{base_url}}/signin`
- Body: raw JSON using `{{test_username}}` and `{{test_password}}` variables

Write tests that assert:
1. Status code is 200
2. Response body `message` equals `"User login successfully"`
3. Response body has a `token` field
4. Response body has a `user` field that is an object

---

## Task 2 — Token format

In the same request, add tests that assert:

5. `token` is a string
6. `token` contains a dot (`.`) — JWT tokens always have dots separating the parts

Hint: `.to.include('.')`

---

## Task 3 — Save token + check user

Still in the same request, add:

7. A test that asserts `user.password` does NOT exist in the response
8. A script line (not a test) that saves the token to the environment:

```js
pm.environment.set('token', pm.response.json().token);
```

---

## Task 4 — Verify cookie was set

After sending **L02 — SignIn success**:

1. Click the **Cookies** tab below the response
2. Verify there is a cookie named `session`
3. Note whether it has `HttpOnly` set

Write a test that asserts:

9. The response has a `set-cookie` header

Hint: `pm.response.headers.has('set-cookie')`

---

## Task 5 — Authenticated request

Create a new request named **L02 — Current User**.

- Method: `GET`
- URL: `{{base_url}}/currentuser`
- No body needed — Postman sends the cookie automatically

Write tests that assert:
1. Status code is 200
2. Response body has a `user` field
3. The username in the response matches `{{test_username}}` (case-insensitive)

Hint for case-insensitive comparison:
```js
pm.expect(body.user.username.toLowerCase()).to.eql(pm.environment.get('test_username').toLowerCase());
```

---

## Task 6 — Signout

Create a request named **L02 — SignOut**.

- Method: `POST`
- URL: `{{base_url}}/signout`
- No body

Write a test that asserts:
1. Status code is 200

After sending signout, send **L02 — Current User** again.
What status code do you get now?

---

## Stretch — Ordered Collection Runner

Run the **Lecture 02** folder with requests in this order:
1. L02 — SignIn success
2. L02 — Current User
3. L02 — SignOut
4. L02 — Current User (expect 401 this time)

> Hint: Postman Runner runs requests in the order they appear in the folder.
> Drag them into the correct order before running.
