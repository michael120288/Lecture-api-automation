# Lecture 10 — Postman Homework

No direct MongoDB in Postman — instead, compare two API endpoints for the same user.

## Task 1 — Signup, then compare signup response vs GET /currentuser
Sign up, then sign in and call GET /currentuser.
Assert both return the same email and username.

## Task 2 — Verify signup response has authId but no password
Assert: `user.authId` exists, `user.password` does not exist.

## Task 3 — Verify GET /currentuser user has authId but no password
Same assertions on the currentuser response.

## Task 4 — The two IDs
Assert: `user._id` (User document) !== `user.authId` (Auth document)
These are two different ObjectIds — one per collection.

## Task 5 — Cleanup via API
Call DELETE /test/cleanup/user/{{authId}} and assert status 200.
Then sign in again — assert 400 (user is gone).
