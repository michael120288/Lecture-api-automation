# Lecture 03 — Postman Homework

Complete these tasks in Postman before looking at `postman-solution.md`.
Create all requests inside a folder named **Lecture 03**.

---

## Task 1 — Successful signup

Create request **L03 — SignUp success**.

- Method: `POST`
- URL: `{{base_url}}/signup`
- Body: raw JSON with:
  - `username`: `"vitestpostman01"`
  - `email`: `"vitestpostman01@test.com"`
  - `password`: `"Vitest@123456"`
  - `avatarColor`: `"#4a90e2"`
  - `avatarImage`: the base64 PNG from `src/fixtures.ts`

Write tests that assert:
1. Status code is 201
2. `message` equals `"User created successfully"`
3. `user` is an object
4. `user.password` does NOT exist
5. Save `user.authId` to the environment as `authId`

---

## Task 2 — Token validation

In the same **L03 — SignUp success** request, add two more tests:

6. `token` is a string
7. `token` contains `"."` (dot — proves it's a JWT)

---

## Task 3 — Duplicate signup

Duplicate **L03 — SignUp success** → rename to **L03 — SignUp duplicate**.
Send exactly the same body again (same username and email).

Write tests that assert:
1. Status code is 400
2. `message` includes `"already"`

---

## Task 4 — Invalid password

Create request **L03 — SignUp invalid password**.
Body: same as Task 1 but change the password to `"NoSpecialChar123"` (no `@$!%*?&`).

Write tests that assert:
1. Status code is 400
2. `message` includes `"must contain"`

---

## Task 5 — Cleanup test user

Create request **L03 — Cleanup user**.

- Method: `DELETE`
- URL: `{{base_url}}/test/cleanup/user/{{authId}}`
- Header: `x-test-secret` = `chatty-test-cleanup-2026`

Write tests that assert:
1. Status is 200
2. `deletedUsername` contains `"vitest"` (case insensitive)

---

## Stretch — Full lifecycle with Collection Runner

Run in this order:
1. **L03 — SignUp success** → creates user, saves `authId`
2. **L03 — SignUp duplicate** → confirms duplicate is rejected
3. **L03 — Cleanup user** → deletes the test user

After the runner completes: try **L03 — SignUp success** again with the same credentials.
What happens? Why?
