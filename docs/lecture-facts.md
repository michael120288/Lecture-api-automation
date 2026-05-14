# Lecture Facts — Source of Truth

Extracted from all 18 lecture test files. Used to cross-reference the book and fix discrepancies.

---

## Lecture 01
- **Endpoints:** `POST /api/v1/signin` (wrong credentials — error path only)
- **validateStatus:** File-level `beforeAll` uses it; each boundary-value and response-time request also passes it per-request
- **Error handling:** `expectRejected(res.status)` — accepts 400 OR 429
- **ID retrieval:** n/a
- **afterAll cleanup:** None
- **Imports:** `config` from `../../src/config`; `expectRejected` from `../../src/test-utils`
- **Concepts:** Basic assertions, exact value assertions, one-request-many-checks, `toMatchObject` shape validation, negative assertions, boundary values (username min 4/max 32, password min 8/max 128), header assertions, response time (<3000ms), assertion variants (`toMatch`, `toBeTypeOf`, `toBeTruthy`, `toBeFalsy`)

---

## Lecture 02
- **Endpoints:** `POST /api/v1/signin`, `GET /api/v1/currentuser`, `POST /api/v1/signout`
- **validateStatus:** File-level `beforeAll` + all individual requests
- **Error handling:** `expectRejected` in negative tests and response-time section
- **ID retrieval:** n/a
- **afterAll cleanup:** `POST /signout` with `validateStatus: () => true`
- **Imports:** `config`, `expectRejected`, `TEST_CLEANUP_SECRET` from fixtures
- **Concepts:** Positive happy-path, JWT format (3 dot-separated parts), session cookie capture (`session` + `session.sig` must be sent together), using cookie on subsequent requests, `afterAll`, assertion variants (`toMatch(/regex/)`, `expect.stringMatching`, `toBeGreaterThanOrEqual`)

---

## Lecture 03
- **Endpoints:** `POST /api/v1/signup`, `DELETE /api/v1/test/cleanup/user/:authId`
- **validateStatus:** File-level `beforeAll` + all individual requests + `afterAll`
- **Error handling:** `expectRejected` in duplicate/boundary sections
- **ID retrieval:** `authId` returned **directly** in `signUpResponse.data.user.authId` — no search needed
- **afterAll cleanup:** `DELETE /test/cleanup/user/:authId` with `x-test-secret` header; `validateStatus: () => true` used
- **Imports:** `config`, `expectRejected`, `TEST_AVATAR_IMAGE`, `TEST_AVATAR_COLOR`, `TEST_PASSWORD`, `TEST_CLEANUP_SECRET` from fixtures; `faker`
- **Concepts:** Faker.js, base64 avatarImage for Cloudinary, full lifecycle, optional chaining/nullish coalescing, duplicate signup (409-class → 400), Joi boundary values (username min 4/max 20, password min 12/max 128 + special char), `setTimeout(1000)` for Bull queue flush, 201 Created vs 200, assertion variants (`toMatch`, `toBeGreaterThanOrEqual`, `toSatisfy`)

---

## Lecture 04
- **Endpoints:** `GET /api/v1/currentuser`, `GET /api/v1/session-token`, `PUT /api/v1/user/profile/basic-info`, `PUT /api/v1/user/profile/settings`, `POST /api/v1/signout`
- **validateStatus:** Per-request on all calls (no file-level shared response)
- **Error handling:** Direct `expect(res.status).toBe(401)` on negative tests
- **ID retrieval:** n/a
- **afterAll cleanup:** Restores `work`/`quote` via PUT basic-info, restores notification settings via PUT settings, then POST signout — all with `validateStatus: () => true`
- **Imports:** `config`, `expectRejected` (imported but used minimally), `TEST_CLEANUP_SECRET`
- **Concepts:** `/currentuser` shape is `{ token, isUser, user }` (NOT `{ message, token, user }` like signin), `/session-token` returns JWT from session, state verification pattern (PUT → GET to confirm), all four notification fields must be sent together, Redis write-through means GET immediately reflects PUT, signout invalidates session, saving/restoring original state, assertion variants (`toBeGreaterThanOrEqual`, `toBeTruthy`, `expect.objectContaining`)

---

## Lecture 05
- **Endpoints:** `POST /api/v1/post`, `GET /api/v1/post/all/:page`, `PATCH /api/v1/post/:postId`, `DELETE /api/v1/post/:postId`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions; `expectRejected` not imported
- **ID retrieval:** `POST /post` returns **only `{ message }`** — no ID. Post ID found via `GET /post/all/1` + `posts.find(p => p.post === UNIQUE_CONTENT)` (content-match workaround)
- **afterAll cleanup:** DELETE main post + section-6 fresh post if not already deleted; POST signout — all with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`
- **Concepts:** Create returns no ID by design, content-match ID lookup, full CRUD cycle, owner-only PATCH/DELETE, ObjectId validation (invalid format → 400), `postDeleted` flag, assertion variants (`expect.arrayContaining`, `toBeLessThanOrEqual`, `toBeTypeOf`)

---

## Lecture 06
- **Endpoints:** `POST /api/v1/post/reaction`, `GET /api/v1/post/reactions/:postId`, `GET /api/v1/post/single/reaction/username/:username/:postId`, `GET /api/v1/post/reactions/username/:username`, `DELETE /api/v1/post/reaction/:postId/:previousReaction/:postReactions`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** Post ID via `GET /post/all/1` + content match (same workaround as L05)
- **afterAll cleanup:** DELETE post + POST signout with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`
- **Concepts:** Six reaction types, DELETE path param 3 = URL-encoded JSON of reaction counts (`encodeURIComponent(JSON.stringify(reactions))`), `userTo` = post owner's userId, username is title-cased for single-reaction endpoint, `GET /post/reactions/:postId` returns `{ reactions: [...], count }`, assertion variants (`expect.stringContaining`, `toBeTypeOf`, `toBeGreaterThanOrEqual`)

---

## Lecture 07
- **Endpoints:** `POST /api/v1/post/comment`, `GET /api/v1/post/comments/:postId`, `GET /api/v1/post/commentsnames/:postId`, `GET /api/v1/post/single/comment/:postId/:commentId`, `PATCH /api/v1/post/comment/:postId/:commentId`, `DELETE /api/v1/post/comment/:postId/:commentId`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** Post ID via `GET /post/all/1` + content match. Comment ID via `GET /post/comments/:postId` + `comments.find(c => c.comment === UNIQUE_COMMENT)`
- **afterAll cleanup:** DELETE comment (if not deleted), DELETE post (if not deleted), POST signout — all with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`
- **Concepts:** `POST /post/comment` returns 200 (not 201) with only `{ message }`, no commentId in create response, comment ID retrieved via GET + content match, full comment CRUD, `/commentsnames/:postId` returns username list, state verification after update, `commentDeleted` + `postDeleted` flags, assertion variants (`toSatisfy`, `toMatch` for ObjectId `/^[a-f0-9]{24}$/`, `expect.arrayContaining`)

---

## Lecture 08
- **Endpoints:** `GET /api/v1/user/all/:page`, `GET /api/v1/user/profile/search/:query`, `PUT /api/v1/user/profile/social-links`, `PUT /api/v1/user/profile/change-password`, `GET /api/v1/currentuser`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** n/a
- **afterAll cleanup:** Restores social links via PUT; POST signout — with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`
- **Concepts:** `/user/all/:page` returns `{ users, totalUsers, followers }`, search is case-insensitive regex, search response shape is `{ message: 'Search results', search: [...] }`, social links state verification via `/currentuser`, change-password validation-only (schema max 8 chars — only test Joi errors safely), mismatched passwords → 400 `"Confirm password does not match"`, assertion variants (`toBeGreaterThanOrEqual`, `expect.arrayContaining`, `toBeTruthy`)

---

## Lecture 09
- **Endpoints:** `PUT /api/v1/user/follow/:followeeId`, `GET /api/v1/user/following`, `GET /api/v1/user/followers/:userId`, `PUT /api/v1/user/unfollow/:followeeId/:followerId`, `PUT /api/v1/user/block/:followerId`, `PUT /api/v1/user/unblock/:followerId`, `GET /api/v1/notifications`, `PUT /api/v1/notification/:notificationId`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** `userAId` from `GET /currentuser`; `userBId`/`userBAuthId` **directly** from `POST /signup` response (no search)
- **afterAll cleanup:** Unfollow + unblock user B, DELETE cleanup user B, POST signout — all with `validateStatus: () => true`
- **Imports:** `config`, `TEST_AVATAR_IMAGE`, `TEST_AVATAR_COLOR`, `TEST_PASSWORD`, `TEST_CLEANUP_SECRET`; `faker`
- **Concepts:** Two-user setup, follow uses PUT (not POST), unfollow requires `followeeId` + `followerId` in URL, notifications may be empty (assert shape only), invalid ObjectId on notification PUT → 400, assertion variants (`expect.objectContaining`, `toBeTypeOf`, `toBeTruthy`)

---

## Lecture 10
- **Endpoints:** `POST /api/v1/signup`, `DELETE /api/v1/test/cleanup/user/:authId` (+ direct MongoDB queries)
- **validateStatus:** Per-request on all API calls; not applicable to MongoDB driver calls
- **Error handling:** Direct assertions
- **ID retrieval:** `authId` and `_id` returned **directly** from `POST /signup` response
- **afterAll cleanup:** DELETE cleanup user via API; `mongoClient.close()` — API call with `validateStatus: () => true`
- **Imports:** `config`, `TEST_AVATAR_IMAGE`, `TEST_AVATAR_COLOR`, `TEST_PASSWORD`, `TEST_CLEANUP_SECRET`; `MongoClient` from `mongodb`; `faker`
- **Concepts:** Direct MongoDB connection requires `DATABASE_URL` env var, cross-validate API vs DB, `Auth` collection (has password hash) vs `User` collection (no password), `API user._id` = User doc ID, `API user.authId` = Auth doc ID, bcrypt hash starts with `$2`, `setTimeout(2000)` for Bull queue flush, dynamic `ObjectId` import, assertion variants (`toMatch` ObjectId regex, `toStrictEqual`, `toBeTypeOf`)

---

## Lecture 11 — NO lecture.test.ts
- Directory contains: `README.md`, `homework/`, `prereqs.md`, `slides.md`, `workflow.yml`
- Topic: CI/CD / GitHub Actions (based on workflow.yml presence)

---

## Lecture 12 — NO lecture.test.ts
- Directory contains: `Dockerfile`, `README.md`, `docker-compose.yml`, `homework/`, `prereqs.md`, `slides.md`
- Topic: Docker / containerized testing

---

## Lecture 13 — NO lecture.test.ts
- Directory contains: `README.md`, `homework/`, `prereqs.md`, `slides.md`, `vitest.config.example.ts`
- Topic: Vitest config / advanced configuration

---

## Lecture 14
- **Endpoints:** `POST /api/v1/forgot-password`, `POST /api/v1/reset-password/:token`, `POST /api/v1/sso`, `POST /api/v1/signin`, `POST /api/v1/signout`
- **validateStatus:** Shared `TEST_OPTS = { headers: { 'x-test-secret': TEST_CLEANUP_SECRET }, validateStatus: () => true }` passed to all requests
- **Error handling:** Direct assertions; `expect([200,400,500]).toContain(res.status)` for real-email forgot-password case
- **ID retrieval:** JWT (`token`) captured directly from signin response
- **afterAll cleanup:** POST signout with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`
- **Concepts:** Forgot-password → 400 for non-existent email with message `"Invalid credentials"`, invalid email format → 400 `"Field must be valid"`, reset-password success path untestable without real email token, invalid reset token → 400 `"Reset token has expired."`, SSO with valid JWT → 200 + sets cookie + returns same token, empty SSO body → 400 `"Token required"`, `TEST_OPTS` shared options pattern, assertion variants (`toBeNull` via `?? null`, `toMatch(/\S+/)`, `toBeTypeOf`)

---

## Lecture 15
- **Endpoints:** `POST /api/v1/post/image/post`, `GET /api/v1/post/all/:page`, `GET /api/v1/post/images/:page`, `PUT /api/v1/post/image/:postId`, `POST /api/v1/post`, `DELETE /api/v1/post/:postId`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** Both `imagePostId` and `plainPostId` found via `GET /post/all/1` + content match loop
- **afterAll cleanup:** DELETE both post IDs; POST signout — all with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`, `TEST_AVATAR_IMAGE`
- **Concepts:** Image post returns 201 `"Post created with image successfully"`, `/post/images/:page` returns only posts with `imgId`, plain posts have no `imgId`, update image post returns 200 `"Post with image updated successfully"`, missing image → 400, invalid image format → 400 `"Image must be..."`, Cloudinary URL from `imgId`/`imgVersion`, assertion variants (`toMatch(/^https?:\/\//)`, `toBeGreaterThan`, `toSatisfy`)

---

## Lecture 16
- **Endpoints:** `GET /api/v1/user/profile`, `GET /api/v1/user/profile/:userId`, `GET /api/v1/user/profile/posts/:username/:userId/:uId`, `GET /api/v1/user/profile/user/suggestions`, `POST /api/v1/images/profile`, `GET /api/v1/images/:userId`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** `userId`, `username`, `uId` all from `GET /currentuser` in `beforeAll`
- **afterAll cleanup:** POST signout only with `validateStatus: () => true`
- **Imports:** `config`, `TEST_CLEANUP_SECRET`, `TEST_AVATAR_IMAGE`
- **Concepts:** Own profile via `GET /user/profile`, profile by userId, profile+posts endpoint requires 3 path params (`username/userId/uId`), `uId` is distinct from `_id`, suggestions may be empty, profile image upload returns 200 `"Image added successfully"`, invalid userId format → 400, assertion variants (`expect.arrayContaining`, `toBeGreaterThanOrEqual`, `toBeTypeOf`)

---

## Lecture 17
- **Endpoints:** `POST /api/v1/chat/message`, `GET /api/v1/chat/message/conversation-list`, `GET /api/v1/chat/message/user/:receiverId`, `PUT /api/v1/chat/message/mark-as-read`, `PUT /api/v1/chat/message/reaction`, `DELETE /api/v1/chat/message/mark-as-deleted/:messageId/:senderId/:receiverId/:type`, `DELETE /api/v1/chat/conversation/:receiverId`
- **validateStatus:** Per-request on all calls
- **Error handling:** Direct assertions
- **ID retrieval:** `conversationId` returned **directly** from first `POST /chat/message` response. `messageId` from `GET /chat/message/user/:receiverId` (`messages[0]._id`)
- **afterAll cleanup:** DELETE cleanup user B; POST signout — both with `validateStatus: () => true`
- **Imports:** `config`, `TEST_AVATAR_IMAGE`, `TEST_AVATAR_COLOR`, `TEST_PASSWORD`, `TEST_CLEANUP_SECRET`; `faker`
- **Concepts:** Two-user setup, first message returns `conversationId` directly, second message can include `conversationId`, `mark-as-read` requires `{ senderId, receiverId }`, message reaction via PUT, delete message = 4-param URL, `type` is `deleteForMe` or `deleteForEveryone`, delete conversation removes from own list only, conversation list key is `list` (not `conversations`), assertion variants (`expect.objectContaining`, `toSatisfy`, `toMatch` for ObjectId)

---

## Lecture 18
- **Endpoints:** `POST /api/v1/signin`, `GET /api/v1/currentuser`, `POST /api/v1/signout`
- **validateStatus:** File-level `beforeAll` + all per-request calls + `afterAll`
- **Error handling:** `expectRejected` in rate-limiting section; direct assertions elsewhere; `try/catch` used only to demonstrate the wrong pattern
- **ID retrieval:** n/a
- **afterAll cleanup:** POST signout with `validateStatus: () => true`
- **Imports:** `config`, `expectRejected`, `TEST_CLEANUP_SECRET`
- **Concepts:** Ten common failure patterns — (1) reading Vitest diff output, (2) missing `validateStatus` causes axios to throw, (3) cookie capture pattern, (4) rate limiting resilience, (5) test isolation, (6) debugging with `console.log` + `--reporter=verbose`

---

## Key Facts Summary

| Fact | Value |
|------|-------|
| Signin endpoint | `POST /api/v1/signin` (never `/auth/signin`) |
| Signout endpoint | `POST /api/v1/signout` |
| Signup endpoint | `POST /api/v1/signup` |
| `POST /post` returns ID? | **NO** — returns `{ message }` only. Use content-match workaround. |
| `POST /signup` returns authId? | **YES** — `response.data.user.authId` directly |
| `POST /chat/message` returns conversationId? | **YES** — `response.data.conversationId` directly |
| `validateStatus` in afterAll? | **YES** — always used in all cleanup calls |
| Lectures missing test file | 11, 12, 13 (CI/CD, Docker, Vitest config topics) |
| signup username max | 20 chars (not 32) |
| signup password min | 12 chars + special char (not 8) |
| signin username max | 32 chars |
| signin password min | 8 chars |
