# Lecture 04 — Postman Homework

Complete these tasks in Postman before looking at `postman-solution.md`.
Create all requests inside a folder named **Lecture 04**.

---

## Task 1 — Current user shape

Create request **L04 — Current User**.

- Method: `GET`
- URL: `{{base_url}}/currentuser`

Write tests that assert:
1. Status is 200
2. `isUser` is `true`
3. `token` is a string
4. `user._id` exists
5. Save `user.work` to the environment as `originalWork`

---

## Task 2 — Update basic info and verify

Create request **L04 — Update Location**.

- Method: `PUT`
- URL: `{{base_url}}/user/profile/basic-info`
- Body: `{ "location": "Postman City" }`

Write a test:
1. Status is 200

Then create **L04 — Verify Location** (`GET {{base_url}}/currentuser`):

2. `user.location` equals `"Postman City"`

---

## Task 3 — Notification settings

Create request **L04 — Update Settings**.

- Method: `PUT`
- URL: `{{base_url}}/user/profile/settings`
- Body: `{ "reactions": false, "follows": false }`

Write tests:
1. Status is 200
2. `settings.reactions` is `false`
3. `settings.follows` is `false`

---

## Task 4 — Session token

Create request **L04 — Session Token**.

- Method: `GET`
- URL: `{{base_url}}/session-token`

Write tests:
1. Status is 200
2. `token` is a string
3. `token` has JWT format — contains `"."`

---

## Task 5 — Signout and verify 401

Create request **L04 — Signout**.

- Method: `POST`
- URL: `{{base_url}}/signout`

Write tests:
1. Status is 200
2. `message` equals `"User logout successfully"`

After sending this request, send **L04 — Current User** again.
What status do you get now? Write down why.

---

## Stretch — Restore and run in Collection Runner

1. Create **L04 — Restore Work** (`PUT /user/profile/basic-info` with `work: "{{originalWork}}"`)
2. Run the full folder in order:
   - L04 — Current User (saves originalWork)
   - L04 — Update Location
   - L04 — Verify Location
   - L04 — Update Settings
   - L04 — Session Token
   - L04 — Restore Work
   - L04 — Signout
3. After the runner finishes, send Current User again — what status do you see?
