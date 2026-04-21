# Chatty API — Endpoint Reference

**Base URL:** `https://api.codeandtest.com/api/v1`
**Authentication:** Session cookie (`session=eyJ...`) — send in every authenticated request as `Cookie: session=eyJ...`
**Content-Type:** `application/json` on all POST/PUT/PATCH requests

**Legend:** 🔒 = requires auth cookie · 🎓 = first covered in lecture · ⚠️ = gotcha

**Interactive docs (Swagger UI):** `https://api.codeandtest.com/api-docs`
**Validation rules as JSON:** `GET https://api.codeandtest.com/api/v1/schema`

---

## Common Error Response

Every 4xx error returns:
```ts
interface ErrorResponse {
  message: string;     // human-readable description
  statusCode: number;  // HTTP status code echoed in body
  status: 'error';
}
```
```json
{ "message": "Invalid credentials", "statusCode": 400, "status": "error" }
```

---

## Rate Limits (nginx)

| Zone | Endpoints | Limit | Effect |
|------|-----------|-------|--------|
| `auth` | `/signin`, `/signup` | 5 req/min + burst 5 | Returns 429 after burst |
| `api` | all other `/api/` routes | 30 req/s + burst 50 | Very rarely hit |

---

## Schema & Discovery

---

### `GET /schema` — Validation rules for all endpoints
Public (no cookie needed)

Returns every endpoint with its accepted fields, validation constraints, success response shape, and all possible error messages. Use this when tests start failing and you want to check if validation rules changed.

**Response:**
```json
{
  "swagger_ui": "https://api.codeandtest.com/api-docs",
  "base_url": "https://api.codeandtest.com/api/v1",
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/v1/signup",
      "auth_required": false,
      "fields": [
        { "name": "username", "type": "string", "required": true, "min": 4, "max": 20 },
        { "name": "password", "type": "string", "required": true, "min": 12, "pattern": "upper+lower+digit+special" }
      ],
      "success": { "status": 201, "body": "{ message, token, user }" },
      "errors": [
        { "status": 400, "message": "Invalid username" },
        { "status": 429, "message": "Too many requests" }
      ]
    }
  ]
}
```

---

## Auth

---

### `POST /signup` — Create a new user
🎓 **Lecture 03** | Public (no cookie needed)

**TypeScript:**
```ts
interface SignUpBody {
  username: string;     // min 4, max 20
  email: string;        // valid email format
  password: string;     // min 12, max 128 + must have: upper, lower, digit, special (@$!%*?&)
  avatarColor: string;  // any non-empty string, e.g. "#4a90e2"
  avatarImage: string;  // data URL (data:image/png;base64,...) or HTTPS URL
}

interface SignUpResponse {
  message: 'User created successfully';
  user: UserDocument;   // see UserDocument type below
  token: string;        // JWT — also set as session cookie
}
```

**Request example:**
```json
{
  "username": "vitestmike",
  "email": "mike@test.com",
  "password": "Vitest@123456",
  "avatarColor": "#4a90e2",
  "avatarImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "authId": "507f1f77bcf86cd799439012",
    "uId": "123456789012",
    "username": "Vitestmike",
    "email": "mike@test.com",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://res.cloudinary.com/...",
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> ⚠️ `password` is never in the response — stripped before sending.
> ⚠️ `username` is title-cased server-side: `"vitestmike"` → `"Vitestmike"`.
> ⚠️ `avatarImage` is uploaded to Cloudinary — fake base64 data fails with 400.
> ⚠️ Response sets `set-cookie: session=eyJ...` alongside the body `token`.
> ⚠️ `user._id` = User collection document. `user.authId` = Auth collection document. Two different IDs.

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| username < 4 chars | `'Username must be at least 4 characters'` |
| username > 20 chars | `'Username cannot exceed 20 characters'` |
| password < 12 chars | `'Password must be at least 12 characters long'` |
| password no special char | `'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'` |
| invalid email | `'Email must be valid'` |
| duplicate username/email | `'User already exists. Username or email is already taken.'` |
| Cloudinary upload fails | `'File upload failed. Please check your image and try again.'` |

---

### `POST /signin` — Sign in
🎓 **Lecture 02** | Public

**TypeScript:**
```ts
interface SignInBody {
  username: string;  // min 4, max 32
  password: string;  // min 8, max 128
}

interface SignInResponse {
  message: 'User login successfully';
  user: UserDocument;
  token: string;
}
```

**Request example:**
```json
{ "username": "vitestmike", "password": "Vitest@123456" }
```

**Response (200):**
```json
{
  "message": "User login successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "authId": "507f1f77bcf86cd799439012",
    "uId": "123456789012",
    "username": "Vitestmike",
    "email": "mike@test.com",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://res.cloudinary.com/...",
    "work": "",
    "school": "",
    "quote": "",
    "location": "",
    "social": { "facebook": "", "instagram": "", "twitter": "", "youtube": "" },
    "notifications": { "messages": true, "reactions": true, "comments": true, "follows": true },
    "postsCount": 0,
    "followersCount": 0,
    "followingCount": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> ⚠️ Both "user not found" and "wrong password" return `'Invalid credentials'` — intentional security design (prevents username enumeration).
> ⚠️ `set-cookie: session=eyJ...` header is also set — use the cookie (not the token) for subsequent requests.

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| username < 4 chars | `'Invalid username'` |
| username > 32 chars | `'Invalid username'` |
| password < 8 chars | `'Invalid password'` |
| wrong credentials | `'Invalid credentials'` |

---

### `POST /signout` 🔒 — Sign out
🎓 **Lecture 02**

No body required.

**Response (200):**
```json
{ "message": "User logout successfully", "user": {}, "token": "" }
```

> ⚠️ Sets `req.session = null` — the cookie on the client still exists but the server ignores it.
> ⚠️ Any subsequent authenticated request with the same cookie returns 401.

---

### `POST /forgot-password` — Request password reset email
Public.

**TypeScript:**
```ts
interface ForgotPasswordBody { email: string; }
```

**Request example:**
```json
{ "email": "mike@test.com" }
```

**Response (200):** `{ "message": "Password reset email sent." }`

> ⚠️ Always returns 200 even if the email doesn't exist (prevents email enumeration).

---

### `POST /reset-password/:token` — Reset password via email link
Public.

**TypeScript:**
```ts
interface ResetPasswordBody {
  password: string;         // min 12, max 128 + pattern
  confirmPassword: string;  // must equal password
}
```

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| passwords don't match | `'Passwords should match'` |
| expired token | (token expiry handled server-side) |

---

## Current User

---

### `GET /currentuser` 🔒 — Get authenticated user
🎓 **Lecture 04**

No body. Reads from Redis cache (always fresh after login).

**TypeScript:**
```ts
interface CurrentUserResponse {
  token: string;      // JWT from current session
  isUser: boolean;    // always true when authenticated
  user: UserDocument;
}
```

**Response (200):**
```json
{
  "token": "eyJhbGci...",
  "isUser": true,
  "user": {
    "_id": "507f1f77...",
    "username": "Vitestmike",
    "email": "mike@test.com",
    "work": "QA Engineer",
    "school": "",
    "quote": "",
    "location": "Kyiv",
    "social": { "facebook": "", "instagram": "", "twitter": "", "youtube": "" },
    "notifications": { "messages": true, "reactions": true, "comments": true, "follows": true },
    "postsCount": 3,
    "followersCount": 1,
    "followingCount": 2
  }
}
```

> ⚠️ Response shape is different from `/signin` — `{ token, isUser, user }` vs `{ message, token, user }`.
> ⚠️ `isUser` is always `true` here — it is `false` only if the user is somehow deleted mid-session.

---

### `GET /session-token` 🔒 — Get JWT from current session
🎓 **Lecture 04**

No body.

**TypeScript:**
```ts
interface SessionTokenResponse { token: string; }
```

**Response (200):** `{ "token": "eyJhbGci..." }`

> ⚠️ Returns the same JWT stored in the session cookie — useful when a frontend needs the raw token.

---

## Posts

---

### `GET /post/all/:page` 🔒 — Get all posts (paginated)
🎓 **Lecture 05**

No body. Page size: **10**. Returns newest first (sorted by `createdAt` descending).

**TypeScript:**
```ts
interface GetPostsResponse {
  message: 'All posts';
  posts: PostDocument[];
  totalPosts: number;
}
```

**Response (200):**
```json
{
  "message": "All posts",
  "posts": [{
    "_id": "507f1f77...",
    "userId": "507f1f77...",
    "username": "Vitestmike",
    "email": "mike@test.com",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://res.cloudinary.com/...",
    "post": "Hello world!",
    "bgColor": "#ffffff",
    "feelings": "",
    "privacy": "Public",
    "gifUrl": "",
    "commentsCount": 0,
    "imgVersion": "",
    "imgId": "",
    "videoId": "",
    "videoVersion": "",
    "createdAt": "2026-04-17T10:00:00.000Z",
    "reactions": { "like": 0, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 }
  }],
  "totalPosts": 42
}
```

> ⚠️ Reads from Redis first, falls back to MongoDB if cache is empty.

---

### `POST /post` 🔒 — Create a plain post
🎓 **Lecture 05**

**TypeScript:**
```ts
interface CreatePostBody {
  post?: string;
  bgColor?: string;
  privacy?: string;         // 'Public' | 'Private' | 'Followers'
  feelings?: string;
  gifUrl?: string;
  profilePicture?: string;  // sender's profile picture
}

interface CreatePostResponse {
  message: 'Post created successfully';
  // NO post _id in response — use GET /post/all/1 to find it
}
```

**Request example:**
```json
{ "post": "My test post!", "bgColor": "#ffffff", "privacy": "Public", "feelings": "" }
```

**Response (201):** `{ "message": "Post created successfully" }`

> ⚠️ Returns 201 (Created) — unlike comments which return 200.
> ⚠️ **No post ID in the response.** Find it by calling `GET /post/all/1` and searching by post text.
> ⚠️ All fields are optional — `{}` is valid and creates an empty post.

---

### `PATCH /post/:postId` 🔒 — Update post
🎓 **Lecture 05**

Same body fields as `POST /post`. `:postId` must be a valid MongoDB ObjectId.

**Response (200):** `{ "message": "Post updated successfully" }`

> ⚠️ Owner-only — returns 403 if you try to update someone else's post.
> ⚠️ Returns only the success message — call `GET /post/all/1` to verify the update.
> ⚠️ Invalid ObjectId format → 400.

---

### `DELETE /post/:postId` 🔒 — Delete post
🎓 **Lecture 05**

No body.

**Response (200):** `{ "message": "Post deleted successfully" }`

> ⚠️ Deletes from Redis immediately (visible in GET right away). DB deletion is queued asynchronously.

---

## Reactions

---

### `POST /post/reaction` 🔒 — Add or switch reaction
🎓 **Lecture 06**

**TypeScript:**
```ts
type ReactionType = 'like' | 'love' | 'happy' | 'sad' | 'wow' | 'angry';

interface AddReactionBody {
  userTo: string;               // User _id of the post owner (NOT authId)
  postId: string;               // Post _id
  type: ReactionType;           // the new reaction type
  previousReaction?: string;    // send current type when SWITCHING reactions, '' when adding first
  postReactions?: {             // current reaction counts object
    like: number; love: number; happy: number;
    sad: number; wow: number; angry: number;
  };
  profilePicture?: string;      // reactor's profile picture
}
```

**Request example — first reaction:**
```json
{
  "userTo": "507f1f77bcf86cd799439011",
  "postId": "507f1f77bcf86cd799439022",
  "type": "like",
  "previousReaction": "",
  "postReactions": { "like": 0, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 },
  "profilePicture": ""
}
```

**Request example — switching from like to love:**
```json
{
  "userTo": "507f1f77...",
  "postId": "507f1f77...",
  "type": "love",
  "previousReaction": "like",
  "postReactions": { "like": 1, "love": 0, "happy": 0, "sad": 0, "wow": 0, "angry": 0 }
}
```

**Response (200):** `{ "message": "Reaction added successfully" }`

> ⚠️ Returns 200 not 201.
> ⚠️ `userTo` is the post **owner's** User `_id` — get it from `post.userId` after creating the post.
> ⚠️ `previousReaction: ""` for first reaction, `previousReaction: "like"` when switching from like.

---

### `GET /post/reactions/:postId` 🔒 — Get all reactions for a post
🎓 **Lecture 06**

**TypeScript:**
```ts
interface GetReactionsResponse {
  message: 'Post reactions';
  reactions: ReactionDocument[];  // individual reaction documents
  count: number;                  // total across all types
}
```

**Response (200):**
```json
{
  "message": "Post reactions",
  "reactions": [{
    "_id": "507f1f77...",
    "username": "Vitestmike",
    "avatarColor": "#4a90e2",
    "type": "like",
    "postId": "507f1f77..."
  }],
  "count": 1
}
```

> ⚠️ `reactions` = array of individual documents. `count` = total number. Both are needed for different use cases.

---

### `DELETE /post/reaction/:postId/:previousReaction/:postReactions` 🔒 — Remove reaction
🎓 **Lecture 06**

All three are URL path params. `:postReactions` is URL-encoded JSON.

**TypeScript:**
```ts
// Build the URL like this:
const postReactions = { like: 1, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 };
const url = `${BASE_URL}/post/reaction/${postId}/like/${encodeURIComponent(JSON.stringify(postReactions))}`;
```

**URL example:**
```
DELETE /post/reaction/507f1f77.../like/%7B%22like%22%3A1%2C%22love%22%3A0%2C%22happy%22%3A0%2C%22sad%22%3A0%2C%22wow%22%3A0%2C%22angry%22%3A0%7D
```

**Response (200):** `{ "message": "Reaction removed from post" }`

> ⚠️ The encoded JSON `{"like":1,...}` represents the current reaction counts **before** removal.
> ⚠️ Without URL-encoding, the `{` and `"` characters break the URL path.

---

## Comments

---

### `POST /post/comment` 🔒 — Add comment
🎓 **Lecture 07**

**TypeScript:**
```ts
interface AddCommentBody {
  userTo: string;          // post owner's User _id
  postId: string;
  comment: string;         // required — the comment text
  profilePicture?: string;
}

interface AddCommentResponse {
  message: 'Comment created successfully';
  // NO commentId — find it via GET /post/comments/:postId
}
```

**Request example:**
```json
{
  "userTo": "507f1f77bcf86cd799439011",
  "postId": "507f1f77bcf86cd799439022",
  "comment": "Great post!",
  "profilePicture": ""
}
```

**Response (200):** `{ "message": "Comment created successfully" }`

> ⚠️ Returns **200**, not 201. Comments are actions on a post, not new top-level resources.
> ⚠️ **No commentId in response.** Find it by calling `GET /post/comments/:postId` and searching by text.

---

### `GET /post/comments/:postId` 🔒 — Get all comments for a post
🎓 **Lecture 07**

**TypeScript:**
```ts
interface GetCommentsResponse {
  message: 'Post comments';
  comments: CommentDocument[];
}

interface CommentDocument {
  _id: string;
  postId: string;
  username: string;
  avatarColor: string;
  profilePicture: string;
  comment: string;
  createdAt: string;
}
```

**Response (200):**
```json
{
  "message": "Post comments",
  "comments": [{
    "_id": "507f1f77...",
    "postId": "507f1f77...",
    "username": "Vitestmike",
    "avatarColor": "#4a90e2",
    "profilePicture": "https://...",
    "comment": "Great post!",
    "createdAt": "2026-04-17T10:00:00.000Z"
  }]
}
```

---

### `GET /post/single/comment/:postId/:commentId` 🔒 — Get one comment
🎓 **Lecture 07**

**Response (200):**
```json
{ "message": "Single comment", "comments": { "_id": "...", "comment": "Great post!", ... } }
```

> ⚠️ Despite `comments` being plural in the key name, it returns a **single object**, not an array.

---

### `PATCH /post/comment/:postId/:commentId` 🔒 — Update comment
🎓 **Lecture 07**

**TypeScript:**
```ts
interface UpdateCommentBody { comment: string; }  // required
```

**Request example:** `{ "comment": "Updated text!" }`

**Response (200):** `{ "message": "Comment updated successfully" }`

> ⚠️ Both `:postId` AND `:commentId` required in URL — invalid ObjectId → 400.

---

### `DELETE /post/comment/:postId/:commentId` 🔒 — Delete comment
🎓 **Lecture 07**

No body.

**Response (200):** `{ "message": "Comment deleted successfully" }`

---

## User Profile

---

### `GET /user/all/:page` 🔒 — Get all users (paginated)
🎓 **Lecture 08**

Page size: **12** (different from posts which uses 10).

**TypeScript:**
```ts
interface GetAllUsersResponse {
  message: 'Get users';
  users: UserDocument[];
  totalUsers: number;
  followers: FollowerData[];  // users the current user is following — bundled for efficiency
}
```

> ⚠️ The `followers` array is bundled in the response alongside the user list — no extra request needed.

---

### `GET /user/profile/search/:query` 🔒 — Search users by username
🎓 **Lecture 08**

Case-insensitive regex search. Encode special characters with `encodeURIComponent()`.

**TypeScript:**
```ts
interface SearchUsersResponse {
  message: 'Search results';
  search: Array<{
    _id: string;
    username: string;
    email: string;
    profilePicture: string;
    avatarColor: string;
  }>;
}
```

**Example URL:** `GET /user/profile/search/vitest`

**Response (200):**
```json
{
  "message": "Search results",
  "search": [{ "_id": "507f1f77...", "username": "Vitestmike", "email": "mike@test.com", "profilePicture": "https://...", "avatarColor": "#4a90e2" }]
}
```

> ⚠️ Returns an empty array `[]` (not 404) when no users match the query.

---

### `PUT /user/profile/basic-info` 🔒 — Update profile fields
🎓 **Lecture 04** / **Lecture 08**

**TypeScript:**
```ts
interface UpdateBasicInfoBody {
  quote?: string;
  work?: string;
  school?: string;
  location?: string;
}
```

**Request example:** `{ "work": "QA Engineer", "location": "Kyiv" }`

**Response (200):** `{ "message": "Updated successfully" }`

> ⚠️ All fields optional — `{}` is valid. Returns only the message — call `GET /currentuser` to verify.

---

### `PUT /user/profile/social-links` 🔒 — Update social links
🎓 **Lecture 08**

**TypeScript:**
```ts
interface UpdateSocialLinksBody {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}
```

**Request example:** `{ "twitter": "https://twitter.com/vitestmike", "youtube": "" }`

**Response (200):** `{ "message": "Updated successfully" }`

---

### `PUT /user/profile/settings` 🔒 — Update notification settings
🎓 **Lecture 04**

**TypeScript:**
```ts
interface UpdateSettingsBody {
  messages?: boolean;
  reactions?: boolean;
  comments?: boolean;
  follows?: boolean;
}
```

**Response (200):**
```json
{
  "message": "Notification settings updated successfully",
  "settings": { "messages": true, "reactions": false, "comments": true, "follows": false }
}
```

> ⚠️ Unlike basic-info, this response **echoes back the applied settings** — no need for a follow-up GET.

---

### `PUT /user/profile/change-password` 🔒 — Change password
🎓 **Lecture 08**

**TypeScript:**
```ts
interface ChangePasswordBody {
  currentPassword: string;   // min 4, max 8 ← unusually short!
  newPassword: string;       // min 4, max 8
  confirmPassword: string;   // must equal newPassword
}
```

**Request example:** `{ "currentPassword": "Test1", "newPassword": "Test2", "confirmPassword": "Test2" }`

**Response (200):** `{ "message": "Password updated successfully. You will be redirected shortly to the login page." }`

> ⚠️ **Schema max is 8 characters** — much shorter than signup (min 12). Accounts with longer passwords get 400.
> ⚠️ Sends a password reset confirmation email after success.
> ⚠️ In tests: only test **validation errors** (mismatch, empty body) — never actually change the password.

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| currentPassword > 8 chars | `'Password should have a maximum length of 8'` |
| passwords don't match | `'Confirm password does not match new password.'` |
| wrong current password | `'Invalid credentials'` |

---

## Followers

---

### `PUT /user/follow/:followerId` 🔒 — Follow a user
🎓 **Lecture 09**

`:followerId` = the **User `_id`** (from `user._id`) of who you want to follow.
No body.

**Response (200):** `{ "message": "..." }`

> ⚠️ Use `user._id` — not `user.authId`. These are different IDs from different collections.
> ⚠️ Get the target user's `_id` from signup response (`user._id`) or search results.

---

### `PUT /user/unfollow/:followeeId/:followerId` 🔒 — Unfollow a user
🎓 **Lecture 09**

`:followeeId` = who you are unfollowing (their `user._id`)
`:followerId` = **your own** `user._id` (get from `GET /currentuser → user._id`)
No body.

**Response (200):** `{ "message": "..." }`

> ⚠️ Requires **both** IDs — unlike follow which only needs the target's ID.
> ⚠️ Your own `_id` comes from `GET /currentuser` → `user._id`.

---

### `GET /user/following` 🔒 — List users you follow
🎓 **Lecture 09**

**TypeScript:**
```ts
interface GetFollowingResponse {
  message: 'User following';
  following: FollowerData[];
}
```

**Response (200):**
```json
{
  "message": "User following",
  "following": [{ "_id": "507f1f77...", "username": "Vitestjohn", "profilePicture": "https://...", "followersCount": 1 }]
}
```

---

### `GET /user/followers/:userId` 🔒 — List followers of a user
🎓 **Lecture 09**

`:userId` = the User `_id` whose followers you want.

**Response (200):** `{ "message": "User followers", "followers": [...] }`

---

### `PUT /user/block/:followerId` 🔒 — Block a user
🎓 **Lecture 09**

No body. Adds user to your `blocked` array and you to their `blockedBy`.
**Response (200):** `{ "message": "..." }`

### `PUT /user/unblock/:followerId` 🔒 — Unblock a user
No body. Reverses blocking.
**Response (200):** `{ "message": "..." }`

> ⚠️ Blocking does: adds to blocked arrays, hides from suggestions, prevents follow-back.

---

## Notifications

---

### `GET /notifications` 🔒 — Get all notifications
🎓 **Lecture 09**

**TypeScript:**
```ts
interface GetNotificationsResponse {
  message: 'User notifications';
  notifications: NotificationDocument[];  // may be empty []
}
```

**Response (200):** `{ "message": "User notifications", "notifications": [] }`

> ⚠️ May be empty on a fresh account. Always assert the shape (is array), not a specific count.

---

### `PUT /notification/:notificationId` 🔒 — Mark notification as read
No body. `:notificationId` must be a valid ObjectId.
**Response (200):** `{ "message": "Notification marked as read" }`

### `DELETE /notifications/:notificationId` 🔒 — Delete notification
No body.
**Response (200):** `{ "message": "Notification deleted successfully" }`

---

## Images

---

### `POST /images/profile` 🔒 — Upload profile picture

**TypeScript:**
```ts
interface AddImageBody {
  image: string;  // data URL (data:image/png;base64,...) or valid HTTPS URL
}
```

**Validation errors (400):**
| Scenario | Error message |
|----------|---------------|
| not data URL or HTTPS URL | `'Image must be either a data URL or HTTP/HTTPS URL'` |
| invalid data URL format | `'Image must be a valid data URL in format: data:image/[type];base64,[data]'` |

**Response (200):** `{ "message": "Image added successfully" }`

---

## Chat

---

### `POST /chat/message` 🔒 — Send a message
🎓 **Not covered in course lectures — reference only**

**TypeScript:**
```ts
interface SendMessageBody {
  receiverId: string;              // required — recipient's User _id
  receiverUsername: string;        // required
  receiverAvatarColor: string;     // required
  receiverProfilePicture: string;  // required
  conversationId?: string;         // omit for first message (creates new conversation)
  body?: string;                   // message text
  gifUrl?: string;
  selectedImage?: string;          // data URL
  isRead?: boolean;
}
```

**Request example:**
```json
{
  "receiverId": "507f1f77...",
  "receiverUsername": "Vitestjohn",
  "receiverAvatarColor": "#ff6b6b",
  "receiverProfilePicture": "https://...",
  "body": "Hello!"
}
```

**Response (200):** `{ "message": "Message added", "conversationId": "..." }`

---

### `PUT /chat/message/mark-as-read` 🔒 — Mark conversation as read

**TypeScript:**
```ts
interface MarkAsReadBody { senderId: string; receiverId: string; }
```

**Response (200):** `{ "message": "Message marked as read" }`

---

### `PUT /chat/message/reaction` 🔒 — React to a chat message

**TypeScript:**
```ts
interface MessageReactionBody {
  conversationId: string;
  messageId: string;
  reaction: string;          // any emoji/string
  type: 'add' | 'remove';
}
```

---

## Test Cleanup (course only)

---

### `DELETE /test/cleanup/user/:authId` — Delete a test user
🎓 **Lecture 03** (introduced)

**Header required:** `x-test-secret: chatty-test-cleanup-2026`

**TypeScript:**
```ts
// Correct usage:
await axios.delete(`${BASE_URL}/test/cleanup/user/${authId}`, {
  headers: { 'x-test-secret': TEST_CLEANUP_SECRET },  // from src/fixtures.ts
  validateStatus: () => true,
});
```

**Responses:**
```json
// 200 — success
{ "message": "Test user deleted successfully", "deletedAuthId": "507f1f77...", "deletedUsername": "Vitestmike" }

// 403 — wrong or missing header
{ "message": "Forbidden: invalid test secret" }

// 400 — username doesn't start with "vitest"
{ "message": "Safety check failed: user \"John\" does not appear to be a test user. Username must start with \"vitest\"." }

// 404 — authId not found
{ "message": "Auth user with id 507f1f77... not found", "status": "error", "statusCode": 404 }
```

> ⚠️ Use `user.authId` from the signup response — NOT `user._id`.
> ⚠️ Username **must** start with `vitest` — safety guard prevents deleting real users.
> ⚠️ Deletes from **both** `Auth` and `User` collections.
> ⚠️ `TEST_CLEANUP_SECRET` is `'chatty-test-cleanup-2026'` — hardcoded in `src/fixtures.ts`, not in `.env`.

---

## Shared TypeScript Types

```ts
interface UserDocument {
  _id: string;             // User collection document ID
  authId: string;          // Auth collection document ID
  uId: string;             // 12-digit numeric string
  username: string;        // title-cased
  email: string;           // lowercase
  avatarColor: string;
  profilePicture: string;  // Cloudinary URL
  work: string;
  school: string;
  quote: string;
  location: string;
  bgImageVersion: string;
  bgImageId: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  blocked: string[];
  blockedBy: string[];
  notifications: {
    messages: boolean;
    reactions: boolean;
    comments: boolean;
    follows: boolean;
  };
  social: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
  // password is NEVER present — stripped before any response
}

interface PostDocument {
  _id: string;
  userId: string;          // post owner's User _id — use as userTo in reactions/comments
  username: string;
  email: string;
  avatarColor: string;
  profilePicture: string;
  post: string;
  bgColor: string;
  feelings: string;
  privacy: string;
  gifUrl: string;
  commentsCount: number;
  imgVersion: string;
  imgId: string;
  videoId: string;
  videoVersion: string;
  createdAt: string;
  reactions: {
    like: number; love: number; happy: number;
    sad: number; wow: number; angry: number;
  };
}
```
