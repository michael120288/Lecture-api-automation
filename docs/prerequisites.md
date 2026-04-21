# Course Prerequisites — What to Know Before Each Lecture

This file lists what to read or watch **before** starting each lecture.
Each item is short (5–15 min). Doing the prep first means you understand
the *why* when the code appears — instead of googling mid-lecture.

Individual `prereqs.md` files also live inside each lecture folder.

---

## Lecture 01 — Setup & Your First API Test
**Total prep time: ~25 min**

- [ ] **What is a REST API?** — [MDN: An overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) (10 min read)
- [ ] **HTTP status codes** — [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) (5 min skim — bookmark it)
- [ ] **Install Node.js 18+** — [nodejs.org](https://nodejs.org/en/download) (5 min)
- [ ] **Install VS Code** — [code.visualstudio.com](https://code.visualstudio.com/) (5 min)

> This lecture also covers project setup from scratch — no prior TypeScript experience needed.

---

## Lecture 02 — SignIn — Authentication & Cookies
**Total prep time: ~20 min**

- [ ] **HTTP cookies** — [MDN: HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) (10 min read) — you will capture a `set-cookie` header in this lecture
- [ ] **What is JWT?** — [jwt.io/introduction](https://jwt.io/introduction) (5 min read) — understand the three-part structure before you test it
- [ ] **Session vs token auth** — [Auth0: Session vs Token](https://auth0.com/docs/manage-users/sessions) (5 min read)

---

## Lecture 03 — SignUp — Creating & Cleaning Up Test Users
**Total prep time: ~15 min**

- [ ] **Base64 encoding** — [MDN: Base64](https://developer.mozilla.org/en-US/docs/Glossary/Base64) (5 min read) — the avatarImage field is a base64 data URL
- [ ] **What is Cloudinary?** — [cloudinary.com/about](https://cloudinary.com/about) (2 min skim) — image CDN used for avatar uploads
- [ ] **bcrypt password hashing (concept only)** — [Wikipedia: bcrypt](https://en.wikipedia.org/wiki/Bcrypt) (5 min read) — why the DB stores `$2b$...` instead of the plain password

---

## Lecture 04 — Current User, Profile Update & Signout
**Total prep time: ~15 min**

- [ ] **What is Redis?** — [redis.io/docs/get-started/](https://redis.io/docs/get-started/) (7 min read) — Chatty writes to Redis first, then queues a DB write
- [ ] **PUT vs PATCH** — [MDN: HTTP methods — PUT vs PATCH](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PATCH#notes) (3 min read) — both appear in this lecture
- [ ] **Concept: state verification** — think about it: if I call PUT to update something, how do I *prove* it was saved? (no link needed — just think for 2 min)

---

## Lecture 05 — Posts — Full CRUD Flow
**Total prep time: ~15 min**

- [ ] **MongoDB ObjectId** — [MongoDB: ObjectId](https://www.mongodb.com/docs/manual/reference/method/ObjectId/) (5 min read) — every `:postId` URL param must be a 24-character hex string
- [ ] **CRUD acronym** — [MDN: CRUD](https://developer.mozilla.org/en-US/docs/Glossary/CRUD) (2 min read) — Create Read Update Delete
- [ ] **API pagination** — [Google: API design guide — pagination](https://cloud.google.com/apis/design/design_patterns#list_pagination) (5 min skim) — the `:page` URL param explained

---

## Lecture 06 — Reactions — All Types & State Transitions
**Total prep time: ~15 min**

- [ ] **URL encoding** — [MDN: encodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) (5 min read) — the DELETE URL has encoded JSON in a path param
- [ ] **What are URL-safe characters?** — [RFC 3986: Unreserved characters](https://datatracker.ietf.org/doc/html/rfc3986#section-2.3) (3 min skim) — why `{` needs to become `%7B`
- [ ] **Atomic operations (concept)** — when switching a reaction, the server removes the old and adds the new in one step. Think about why this matters (2 min)

---

## Lecture 07 — Comments — Full CRUD + Nested Queries
**Total prep time: ~10 min**

- [ ] **Nested resources in REST** — [RESTful API Design: Nested Resources](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/) (7 min read) — why `/post/comment/:postId/:commentId` needs both IDs
- [ ] **HTTP 200 vs 201** — [MDN: 200 OK](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/200) and [MDN: 201 Created](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201) (3 min skim) — `POST /post/comment` returns 200, not 201

---

## Lecture 08 — User Profile Search, Social Links & Password
**Total prep time: ~10 min**

- [ ] **Regular expressions basics** — [MDN: Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) (10 min read) — the search endpoint uses a case-insensitive regex to match usernames

---

## Lecture 09 — Followers, Blocking & Notifications
**Total prep time: ~10 min**

- [ ] **Many-to-many relationships** — [MDN: Relational databases — many-to-many](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Django/Models#many-to-many_relationships) (5 min read) — followers are a many-to-many: user A follows user B who follows user C
- [ ] **Push notifications concept** — [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) (5 min skim) — what triggers a notification in Chatty

---

## Lecture 10 — MongoDB — Cross-Validating API vs Database
**Total prep time: ~20 min**

- [ ] **MongoDB Atlas** — [MongoDB Atlas overview](https://www.mongodb.com/docs/atlas/) (5 min read) — cloud-hosted MongoDB, what `DATABASE_URL` connects to
- [ ] **bcrypt algorithm** — [Auth0: Hashing passwords](https://auth0.com/blog/hashing-passwords-one-way-road-to-security/) (10 min read) — why the DB stores `$2b$10$...` and you can never reverse it
- [ ] **Black-box vs grey-box testing** — [ISTQB glossary](https://glossary.istqb.org/) — search "grey-box" (3 min) — this lecture crosses from black-box API testing into grey-box (API + DB)

---

## Lecture 11 — CI/CD — GitHub Actions Pipeline
**Total prep time: ~20 min**

- [ ] **What is CI/CD?** — [GitHub: Understanding CI/CD](https://docs.github.com/en/actions/about-github-actions/understanding-github-actions) (10 min read)
- [ ] **YAML syntax** — [yaml.org learn](https://yaml.org/learn.html) (5 min read) — indentation-based, used for the workflow file
- [ ] **GitHub Actions marketplace** — [github.com/marketplace](https://github.com/marketplace?type=actions) (2 min browse) — see `actions/checkout`, `actions/setup-node`

---

## Lecture 12 — Docker — Containerising the Test Runner
**Total prep time: ~20 min**

- [ ] **What is Docker?** — [Docker: Get started overview](https://docs.docker.com/get-started/overview/) (10 min read)
- [ ] **Containers vs virtual machines** — [Docker blog: Containers vs VMs](https://www.docker.com/blog/containers-and-vms-a-practical-comparison/) (5 min read)
- [ ] **Install Docker Desktop** — [docs.docker.com/get-docker/](https://docs.docker.com/get-docker/) (5 min) — required to build and run the container

---

## Lecture 13 — Test Reporting — Vitest, Newman & Coverage
**Total prep time: ~15 min**

- [ ] **Code coverage concept** — [Atlassian: Code coverage explained](https://www.atlassian.com/continuous-delivery/software-testing/code-coverage) (7 min read) — what "80% coverage" actually means
- [ ] **JUnit XML format** — [Wikipedia: JUnit](https://en.wikipedia.org/wiki/JUnit) (3 min skim) — the XML format CI/CD tools consume
- [ ] **Newman (Postman CLI)** — [Newman docs](https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/) (5 min skim) — running Postman collections without the UI

---

## Lecture 14 — Password Reset & SSO
**Total prep time: ~15 min**

- [ ] **Password reset email flow** — [OWASP: Forgot password cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) (10 min read) — how tokens expire, why one-time-use matters
- [ ] **What is SSO?** — [Auth0: What is SSO?](https://auth0.com/blog/what-is-and-how-does-single-sign-on-work/) (5 min read) — using an existing token to create a new session

---

## Lecture 15 — Posts with Media — Images & Videos
**Total prep time: ~15 min**

- [ ] **Data URLs** — [MDN: Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) (7 min read) — the `data:image/png;base64,...` format used for the `image` field
- [ ] **How Cloudinary works** — [Cloudinary: How it works](https://cloudinary.com/documentation/how_cloudinary_works) (5 min read) — upload → transform → CDN delivery
- [ ] **Image MIME types** — [MDN: MIME types — image types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#image_types) (3 min skim) — `image/png`, `image/jpeg`, `image/webp`

---

## Lecture 16 — User Profile Pages & Image Management
**Total prep time: ~10 min**

- [ ] **REST resource nesting** — [RESTful API Design: Nesting](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/) (7 min read) — why profile pages bundle multiple sub-resources
- [ ] **CDN concept** — [Cloudflare: What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/) (3 min read) — how profile pictures are served fast globally

---

## Lecture 17 — Chat & Messaging
**Total prep time: ~15 min**

- [ ] **WebSocket vs HTTP** — [MDN: WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) (7 min read) — Chatty uses Socket.IO for real-time chat delivery
- [ ] **Conversation threading** — [Wikipedia: Conversation threading](https://en.wikipedia.org/wiki/Conversation_threading) (3 min read) — why `conversationId` ties messages together
- [ ] **Long polling vs WebSocket vs SSE** — [Ably: Real-time technologies comparison](https://ably.com/topic/websockets-vs-long-polling) (5 min skim) — context for why chat uses sockets
