# Lecture 07 — Postman Homework

Create folder **Lecture 07**. Uses `{{postId}}` and `{{postOwnerUserId}}` from L05.

## Task 1 — Add comment
- POST `{{base_url}}/post/comment`
- Body: `{ "userTo": "{{postOwnerUserId}}", "postId": "{{postId}}", "comment": "My first comment", "profilePicture": "" }`
- Assert: status 200, message "Comment created successfully", NO `_id` in response

## Task 2 — Get comments + save ID
- GET `{{base_url}}/post/comments/{{postId}}`
- Find comment with `comment === "My first comment"`, save `_id` as `commentId`
- Assert: status 200, comments array non-empty

## Task 3 — Update comment
- PATCH `{{base_url}}/post/comment/{{postId}}/{{commentId}}`
- Body: `{ "comment": "Updated comment" }`
- Assert: status 200

## Task 4 — Verify update via single comment
- GET `{{base_url}}/post/single/comment/{{postId}}/{{commentId}}`
- Assert: `comments.comment === "Updated comment"`

## Task 5 — Delete comment
- DELETE `{{base_url}}/post/comment/{{postId}}/{{commentId}}`
- Assert: status 200, message "Comment deleted successfully"

## Stretch
Run all 5 in order with Collection Runner. Verify the comment is gone after deletion.
