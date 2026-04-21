# Lecture 05 — Postman Homework

Complete these tasks in Postman before looking at `postman-solution.md`.
Create all requests inside a folder named **Lecture 05**.

---

## Task 1 — Create a post

Create request **L05 — Create Post**.

- Method: `POST`, URL: `{{base_url}}/post`
- Body: `{ "post": "My homework post!", "bgColor": "#ffffff", "privacy": "Public", "feelings": "" }`

Write tests that assert:
1. Status is 201
2. Message equals `"Post created successfully"`
3. The response does NOT contain a `_id` field

---

## Task 2 — Get posts and save ID

Create request **L05 — Get All Posts**.

- Method: `GET`, URL: `{{base_url}}/post/all/1`

Write tests that assert:
1. Status is 200
2. `posts` is an array
3. `totalPosts` is greater than 0

Also write a script (not a test) that finds the post with `post === "My homework post!"` and saves its `_id` to `{{postId}}`.

---

## Task 3 — Update the post

Create request **L05 — Update Post**.

- Method: `PATCH`, URL: `{{base_url}}/post/{{postId}}`
- Body: `{ "post": "Updated homework post!", "bgColor": "#ffffff", "privacy": "Public", "feelings": "" }`

Write tests that assert:
1. Status is 200
2. Message equals `"Post updated successfully"`

---

## Task 4 — Verify the update

Duplicate **L05 — Get All Posts** → rename to **L05 — Verify Update**.

Write a test that:
1. Finds the post with `_id === pm.environment.get('postId')`
2. Asserts its `post` content equals `"Updated homework post!"`

---

## Task 5 — Delete the post

Create request **L05 — Delete Post**.

- Method: `DELETE`, URL: `{{base_url}}/post/{{postId}}`

Write tests that assert:
1. Status is 200
2. Message equals `"Post deleted successfully"`

---

## Stretch — Run in order with Collection Runner

Run in this order and ensure all tests pass:
1. L05 — Create Post
2. L05 — Get All Posts (saves `postId`)
3. L05 — Update Post
4. L05 — Verify Update
5. L05 — Delete Post

**Question:** After step 5, run **L05 — Get All Posts** again. Is the deleted post still visible? Why or why not?
