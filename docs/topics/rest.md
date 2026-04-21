# REST

**Related topics:** [What Is API Testing](what-is-api-testing.md) | [HTTP Requests](http-requests.md) | [HTTP Status Codes](http-status-codes.md) | [HTTP Headers](http-headers.md)

---

## 1. What Is REST?

**REST** stands for **Representational State Transfer**. It is an architectural style — a set of design constraints — for building networked applications. REST was described by Roy Fielding in his 2000 PhD dissertation.

REST is not a protocol, not a specification, and not a library. It is a set of principles. An API that follows those principles is called **RESTful**.

The Chatty API (`https://api.codeandtest.com/api/v1`) is a RESTful API. Every endpoint you test in this course follows REST conventions. Understanding those conventions helps you predict how an endpoint will behave before you test it.

---

## 2. The Six REST Constraints

### 2.1 Client-Server

The client and the server are separate systems with a clear boundary between them.

The client (React frontend, or your test code) is responsible for the user interface and user experience. The server is responsible for data storage, business logic, and security. Neither knows about the internal implementation of the other.

**In practice for testing:** Your Axios requests are the client. You do not need to know whether Chatty stores data in MongoDB, Redis, or a flat file. You only care about the contract: what you send in, and what comes back out.

### 2.2 Stateless

Each request must contain all the information needed to process it. The server does not store any client context between requests.

This means the server does not remember "this is the same client that signed in 30 seconds ago" unless the client includes proof of authentication in every request.

**In practice for testing:** After signing in and receiving a `set-cookie: session=eyJ...` header, you must include `Cookie: session=eyJ...` on every subsequent authenticated request. If you forget the cookie, the server has no way to identify you and returns `401 Unauthorized`.

```typescript
// Wrong — the cookie from signin is not forwarded
const signinRes = await axios.post(`${BASE_URL}/signin`, credentials, opts);
const currentUserRes = await axios.get(`${BASE_URL}/currentuser`, opts);
// ^ Returns 401 — server has no idea who this is

// Correct — forward the cookie explicitly
const cookie = signinRes.headers['set-cookie']![0].split(';')[0];
const currentUserRes = await axios.get(`${BASE_URL}/currentuser`, {
  headers: { Cookie: cookie },
  validateStatus: () => true,
});
// ^ Returns 200
```

### 2.3 Cacheable

Responses must indicate whether they can be cached. Clients (and intermediaries like CDNs) can cache responses to improve performance.

**In practice:** GET responses for public data (post lists, user profiles) can often be cached. Authentication endpoints are never cached. The Chatty API does not implement explicit cache-control headers in this course, but the concept explains why Redis is used as a cache layer server-side.

### 2.4 Uniform Interface

This is the most important constraint. It means the API uses consistent conventions for everything:

- **Identification of resources:** Every resource has a URL that uniquely identifies it.
- **Manipulation through representations:** You interact with a resource by sending a representation (JSON) of the state you want.
- **Self-descriptive messages:** Each request contains enough information to describe how to process it (Content-Type header, HTTP method).
- **Hypermedia as the engine of application state (HATEOAS):** Responses can contain links to related actions. Most APIs, including Chatty, implement partial HATEOAS at best.

**In practice:** Because Chatty follows uniform interface, you can make reasonable predictions. You know that `GET /post/all/1` returns a list, that `POST /post` creates a post, that `DELETE /post/:postId` deletes one. The naming and structure are consistent.

### 2.5 Layered System

The client does not need to know whether it is talking directly to the server or through intermediaries (load balancers, CDNs, proxies, API gateways).

**In practice for testing:** Chatty uses nginx as a reverse proxy in front of the Node.js application. Nginx handles rate limiting (returning `429 Too Many Requests`) before the request even reaches the app. Your tests do not need to know this — you just see the `429` response and assert accordingly.

### 2.6 Code on Demand (Optional)

Servers can optionally extend client functionality by sending executable code (like JavaScript). This constraint is optional and rarely discussed.

---

## 3. Resources and URLs

In REST, everything is a **resource**. A resource is any concept that can be named — a user, a post, a comment, a reaction.

Resources are identified by **URLs** (Uniform Resource Locators).

### URL Patterns in Chatty

| Resource | URL Pattern | Notes |
|----------|-------------|-------|
| All posts (paginated) | `/post/all/:page` | Collection |
| Single post | `/post/:postId` | Item |
| All comments on a post | `/post/comments/:postId` | Sub-collection |
| Single comment | `/post/single/comment/:postId/:commentId` | Sub-item |
| Current user | `/currentuser` | Singleton |
| All users (paginated) | `/user/all/:page` | Collection |
| Specific user profile | `/user/profile/:userId` | Item |
| User's followers | `/user/followers/:userId` | Sub-collection |

### Reading a URL

```
https://api.codeandtest.com/api/v1/post/all/1
|_____________________________| |_| |________|
         base URL               ver  resource path
```

The `:page` in `/post/all/:page` is a **path parameter** — a variable part of the URL that identifies a specific resource or variant. `1` means page 1.

---

## 4. CRUD Mapped to HTTP Methods

REST maps the four basic data operations (Create, Read, Update, Delete) to HTTP methods.

| Operation | HTTP Method | Chatty Example | Typical Status |
|-----------|------------|----------------|---------------|
| Create | POST | `POST /post` | 201 Created |
| Read | GET | `GET /post/all/1` | 200 OK |
| Full Update | PUT | `PUT /user/profile/basic-info` | 200 OK |
| Partial Update | PATCH | `PATCH /post/:postId` | 200 OK |
| Delete | DELETE | `DELETE /post/:postId` | 200 OK |

Note: Chatty uses `200` for successful DELETEs rather than `204 No Content`. This is a valid choice — REST does not mandate `204`, it only suggests it.

### POST vs PUT vs PATCH

This distinction trips up many beginners.

**POST** creates a new resource. The server decides the new resource's URL/ID. You do not know the ID of the created resource before sending the request.

```typescript
// POST — creates a new post, server assigns _id
const res = await axios.post(`${BASE_URL}/post`, {
  post: 'Hello world',
  bgColor: '#ffffff',
  privacy: 'Public',
});
// res.data = { message: 'Post created successfully' }
// There is NO _id in the response — you must fetch it separately
```

**PUT** replaces a resource entirely. You send the complete new state. Fields not included are set to empty/null.

```typescript
// PUT — replaces all basic info fields
const res = await axios.put(`${BASE_URL}/user/profile/basic-info`, {
  quote: 'Testing is not optional',
  work: 'QA Engineer',
  school: '',
  location: 'Kyiv',
});
```

**PATCH** updates only the fields you send. Other fields are left unchanged.

```typescript
// PATCH — only updates the post text, other fields untouched
const res = await axios.patch(`${BASE_URL}/post/${postId}`, {
  post: 'Updated text',
});
```

In Chatty, `PUT /user/profile/basic-info` behaves more like PATCH in practice (it only applies the fields you send), but the semantic intent of PUT is a full replacement.

---

## 5. What Makes an API "RESTful"?

An API is considered RESTful when it follows the constraints above. In practice, most APIs follow a pragmatic subset:

**Fully RESTful practices in Chatty:**
- Resources identified by URLs
- Consistent use of HTTP methods (GET reads, POST creates, DELETE removes)
- Stateless — auth token in every request
- Consistent error format across all endpoints
- Correct status codes (201 for created, 400 for validation, 401 for auth, 403 for forbidden)

**Common REST compromises in Chatty (and most real APIs):**
- `POST /signin` and `POST /signout` are actions, not resource creations — this is common and pragmatic
- `POST /post/reaction` uses POST for an action that could arguably be modeled as PUT on a reaction resource
- Some `DELETE` operations return `200` with a body instead of `204 No Content`

These are not failures. REST is a guide, not a law, and pragmatic APIs routinely bend the constraints for usability.

---

## 6. REST vs SOAP vs GraphQL

When people say "API testing" they usually mean REST APIs, but it is worth knowing the alternatives.

### SOAP

**SOAP** (Simple Object Access Protocol) is an older protocol for web services. It uses XML, defines a strict message format, has a WSDL (Web Services Description Language) contract file, and is transport-agnostic (HTTP, SMTP, etc.).

| Aspect | SOAP | REST |
|--------|------|------|
| Format | XML | JSON (usually) |
| Contract | WSDL (explicit, generated) | Documentation (informal) |
| Transport | Any | HTTP |
| Verbosity | High | Low |
| Error handling | Fault envelopes | HTTP status codes |
| Typical use | Enterprise, banking, legacy | Web APIs, mobile, microservices |

SOAP is rare in new projects. You are unlikely to encounter it unless working with enterprise systems or government services.

### GraphQL

**GraphQL** is a query language and runtime developed by Facebook (now Meta). Instead of multiple endpoints, it has a single endpoint (`/graphql`) where clients send queries describing exactly the data they want.

```graphql
# GraphQL query — ask for exactly the fields you need
query {
  user(id: "507f1f77...") {
    username
    email
    postsCount
  }
}
```

| Aspect | REST | GraphQL |
|--------|------|---------|
| Endpoints | Multiple (one per resource) | Single `/graphql` |
| Data fetching | Server decides what to return | Client specifies fields |
| Over-fetching | Common | Eliminated |
| Under-fetching | Requires multiple requests | Single request for nested data |
| HTTP methods | GET, POST, PUT, PATCH, DELETE | POST (usually) |
| Caching | Easy (HTTP caching by URL) | Complex |
| Learning curve | Low | Medium-High |

The Chatty API is REST. GraphQL testing uses different tools and patterns and is outside the scope of this course.

---

## 7. Chatty API Endpoint Overview

Here is how Chatty's endpoints map to REST concepts:

### Auth (actions, not resources)

```
POST   /signup                    Create a user account
POST   /signin                    Authenticate (create a session)
POST   /signout                   Destroy the session
POST   /forgot-password           Trigger a password reset email
POST   /reset-password/:token     Apply a password reset
```

### Posts (resource CRUD)

```
GET    /post/all/:page            Read all posts (paginated)
POST   /post                      Create a post
PATCH  /post/:postId              Update a post
DELETE /post/:postId              Delete a post
```

### Comments (sub-resource CRUD)

```
POST   /post/comment                           Create a comment
GET    /post/comments/:postId                  Read all comments on a post
GET    /post/single/comment/:postId/:commentId Read one comment
PATCH  /post/comment/:postId/:commentId        Update a comment
DELETE /post/comment/:postId/:commentId        Delete a comment
```

### Reactions (actions on a resource)

```
POST   /post/reaction                                         Add/switch reaction
GET    /post/reactions/:postId                               Get reactions for a post
DELETE /post/reaction/:postId/:previousReaction/:postReactions  Remove reaction
```

### Users (profile resource)

```
GET    /user/all/:page                   Read all users (paginated)
GET    /user/profile/search/:query       Search users
PUT    /user/profile/basic-info          Update profile info
PUT    /user/profile/social-links        Update social links
PUT    /user/profile/settings            Update notification settings
PUT    /user/profile/change-password     Change password
```

### Followers (relational actions)

```
PUT    /user/follow/:followerId              Follow a user
PUT    /user/unfollow/:followeeId/:followerId Unfollow a user
GET    /user/following                       List users you follow
GET    /user/followers/:userId               List a user's followers
PUT    /user/block/:followerId               Block a user
PUT    /user/unblock/:followerId             Unblock a user
```

---

## 8. REST Conventions You Can Rely On for Testing

Because Chatty is RESTful, you can apply these prediction rules when writing tests:

1. **If the method is GET, the request has no body.** No need to set Content-Type.
2. **If the method is POST/PUT/PATCH, the request body is JSON.** Always set `Content-Type: application/json`.
3. **If the status is 2xx, the operation succeeded.** Assert the message and data shape.
4. **If the status is 4xx, the client sent something wrong.** Assert the error message.
5. **If the status is 401, the cookie is missing or expired.** Verify your auth setup.
6. **If the status is 403, you are authenticated but not allowed.** Test this for owner-only operations.
7. **A URL with `:id` in it requires a valid MongoDB ObjectId.** Invalid format returns 400.

---

## Common Mistakes

| Mistake | Explanation |
|---------|-------------|
| Sending a body with a GET request | REST GET has no body. Some frameworks ignore it silently, others reject it. Don't do it. |
| Using POST when you mean PUT | POST creates new resources. PUT replaces an existing one. Using POST for updates is a REST violation. |
| Treating all 2xx as identical | `200 OK` and `201 Created` have different meanings. Chatty uses both — assert the exact code. |
| Ignoring the URL structure | `/post/comments/:postId` tells you this is a sub-collection on a post. The `:postId` is required. |
| Using query strings for IDs | REST uses path parameters for resource IDs (`/post/507f1f77`), not query strings (`/post?id=507f1f77`). |

---

## Related Topics

- [What Is API Testing](what-is-api-testing.md) — overview of API testing and the testing pyramid
- [HTTP Requests](http-requests.md) — full anatomy of requests and responses
- [HTTP Status Codes](http-status-codes.md) — every status code in the Chatty API explained
- [HTTP Headers](http-headers.md) — Content-Type, Cookie, and how authentication works

## Official Documentation

- [Roy Fielding's original REST dissertation](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
- [MDN — HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)
- [RESTful API Design — Best practices](https://restfulapi.net/)
- [Richardson Maturity Model](https://martinfowler.com/articles/richardsonMaturityModel.html)
