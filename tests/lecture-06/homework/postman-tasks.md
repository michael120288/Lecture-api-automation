# Lecture 06 — Postman Homework

Create folder **Lecture 06**. You need `{{postId}}` and `{{postOwnerUserId}}` — run the Lecture 05 Collection Runner first (or set them manually from a post you created).

## Task 1 — Add 'happy' reaction
- POST `{{base_url}}/post/reaction`
- Body: `{ "userTo": "{{postOwnerUserId}}", "postId": "{{postId}}", "type": "happy", "previousReaction": "", "postReactions": { "like": 0, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 }, "profilePicture": "" }`
- Assert: status 200, message "Reaction added successfully"

## Task 2 — Get reactions + count
- GET `{{base_url}}/post/reactions/{{postId}}`
- Assert: status 200, `count` >= 1, `reactions` is an array

## Task 3 — Get single reaction by username
- GET `{{base_url}}/post/single/reaction/username/{{test_username}}/{{postId}}`
  (where `test_username` is your title-cased username)
- Assert: status 200, `reactions` property exists

## Task 4 — Switch reaction from 'happy' to 'wow'
Add a 'wow' reaction with `previousReaction: "happy"`.
This switches the reaction type.
Assert: status 200

## Task 5 — Remove reaction
Build the DELETE URL manually:
- Encode `{"like":0,"love":0,"happy":0,"sad":0,"wow":1,"angry":0}` with encodeURIComponent
- DELETE `{{base_url}}/post/reaction/{{postId}}/wow/<encoded>`
- Assert: status 200, message "Reaction removed from post"

## Stretch
Add all 6 reaction types one by one and verify the count after each.
