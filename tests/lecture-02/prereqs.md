# Before Lecture 02 — SignIn — Authentication & Cookies

**Total prep time: ~25 min**

---

## Essential

- [ ] **HTTP cookies**
  Read: [MDN — HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
  *~10 min · Focus on: `Set-Cookie` header, `HttpOnly`, `Secure` flags*
  You will capture a `set-cookie` response header and pass it in subsequent requests.

- [ ] **What is a JWT?**
  Read: [jwt.io/introduction](https://jwt.io/introduction)
  *~5 min · Understand: 3-part structure (header.payload.signature), base64url encoding*
  You will validate JWT format by checking it has exactly 3 dot-separated parts.

- [ ] **Session vs token auth**
  Read: [Auth0 — Sessions vs JWTs](https://auth0.com/docs/secure/tokens/json-web-tokens)
  *~5 min · Chatty stores the JWT inside the session cookie — both concepts at once*

---

## Videos

- [ ] **JWT explained in 10 minutes** — Web Dev Simplified
  Watch: https://www.youtube.com/watch?v=mbsmsi7l3r4
  *~15 min · Covers signing, verifying, and why JWTs replace sessions in modern apps*

- [ ] **Cookies explained** — Fireship
  Watch: https://www.youtube.com/watch?v=UBUNrFtufWo
  *~6 min · Visual breakdown of how cookies flow between browser and server*

---

## Interactive tools

- [ ] **jwt.io decoder** — paste any JWT and see the decoded payload
  Try: [jwt.io](https://jwt.io/#debugger-io)
  *~5 min · Sign in to Chatty, copy the token from the response, paste here*
  You will see the exact payload: `userId`, `username`, `email`, `avatarColor`

- [ ] **Cookie editor browser extension**
  Try: Search your browser's extension store → *"Cookie Editor"*
  *~3 min · Lets you inspect cookies in DevTools — useful for seeing the session cookie*

---

## Also useful

- [MDN — `Set-Cookie` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) — every attribute explained
- [RFC 7519 — JWT specification](https://datatracker.ietf.org/doc/html/rfc7519) — the official spec (advanced reading)
- [Auth0 — Why use HTTP cookies?](https://auth0.com/docs/manage-users/cookies) — cookies vs localStorage tradeoffs

---

> **From Lecture 1:** Project installed, `npm test tests/lecture-01/lecture.test.ts` passing (6 tests).
> Your `.env` must have `BASE_URL=https://api.codeandtest.com/api/v1`.
> You also need a `TEST_USERNAME` account created on codeandtest.com.
