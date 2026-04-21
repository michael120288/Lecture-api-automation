# Lecture 09 — Postman Homework

You need two user IDs. Set `{{userBId}}` manually or run the L09 tests first.

## Task 1 — Follow user B
PUT `{{base_url}}/user/follow/{{userBId}}` — assert 200

## Task 2 — Get following
GET `{{base_url}}/user/following` — assert `following` array non-empty

## Task 3 — Get followers of user B  
GET `{{base_url}}/user/followers/{{userBId}}` — assert `followers` array non-empty

## Task 4 — Unfollow
PUT `{{base_url}}/user/unfollow/{{userBId}}/{{userAId}}` — assert 200
Then GET following — assert user B is gone

## Task 5 — Notifications
GET `{{base_url}}/notifications` — assert status 200, `notifications` is array
