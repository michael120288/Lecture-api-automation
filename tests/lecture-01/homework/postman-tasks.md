# Lecture 01 — Postman Homework

Complete these tasks in Postman before looking at `postman-solution.md`.

Use the **Chatty API** collection and **Chatty Prod** environment you set up in the lecture.

---

## Task 1 — Wrong credentials

Create a request named **L01 — SignIn wrong credentials** inside a folder named **Lecture 01**.

- Method: `POST`
- URL: `{{base_url}}/signin`
- Body: raw JSON with a username and password that do not exist

Write tests that assert:
1. Status code is 400
2. Response body has a `message` field
3. Response body `status` field equals `"error"`

---

## Task 2 — Exact message

In the same request, add a fourth test that asserts:

4. The `message` field equals exactly `"Invalid credentials"`

---

## Task 3 — Empty body

Duplicate the request → rename to **L01 — SignIn empty body**.
Change the body to `{}`.

Write tests that assert:
1. Status code is 400
2. Response body has a `message` field

---

## Task 4 — No token on error

Back in **L01 — SignIn wrong credentials**, add a test that asserts:

5. The response body does NOT have a `token` property

Hint: `pm.expect(body).to.not.have.property('token')`

---

## Task 5 — Boundary value

Create a request named **L01 — SignIn username too short**.
Send a username with only 3 characters (below the minimum of 4).

Write a test that asserts:
1. Status code is 400
2. The message contains `"Invalid username"`

Hint: `.to.include('Invalid username')`

---

## Stretch — Run all with Collection Runner

1. Open the **Lecture 01** folder
2. Click **Run** → **Run Lecture 01**
3. All 5 requests should pass all tests

> The goal: every request in the folder runs and all tests pass automatically.
