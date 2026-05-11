# Before Lecture 01 — Setup & Your First API Test

**Total prep time: ~35 min**

Complete these before starting the lecture.

---

## Before Anything Else — Register Your Account

- [ ] **Register on codeandtest.com**
  Sign up at: [codeandtest.com](https://codeandtest.com)

  > **Your username MUST start with `vitest`** — for example: `vitestmike`, `vitestjane`, `vitest_yourname`.
  >
  > This is not optional. The cleanup endpoint used in later lectures only works for accounts whose username begins with `vitest`. If you register with a different username you will not be able to clean up test data and will need to create a new account.

  *~2 min · Do this first — you need a real account to run the tests in this lecture.*

---

## Essential (do these first)

- [ ] **What is a REST API?**
  Read: [MDN — An overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview)
  *~10 min · Understand: request/response, methods (GET/POST), headers, body*

- [ ] **HTTP status codes**
  Read: [MDN — HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
  *~5 min skim · Bookmark this — refer back during every lecture*
  Focus on: **200** OK · **201** Created · **400** Bad Request · **401** Unauthorized · **403** Forbidden · **404** Not Found · **429** Too Many Requests

- [ ] **Install Node.js 18+**
  Download: [nodejs.org/en/download](https://nodejs.org/en/download)
  *~5 min · Verify: `node --version` → should show v18 or v20*

- [ ] **Install VS Code**
  Download: [code.visualstudio.com](https://code.visualstudio.com/)
  *~5 min · Recommended extensions: ESLint, Prettier, REST Client*

---

## Videos (pick one)

- [ ] **HTTP Crash Course** — Traversy Media
  Watch: https://www.youtube.com/watch?v=iYM2zFP3Zn0
  *~37 min · Covers everything: methods, status codes, headers, body, REST*

- [ ] **REST API explained in 5 minutes** — Fireship
  Watch: https://www.youtube.com/watch?v=-MTSQjw5DrM
  *~6 min · Fast-paced visual overview — perfect if you already know some HTTP*

---

## Interactive tools (bookmark these)

- [ ] **Postman** — the API testing GUI used in every lecture
  Download: [postman.com/downloads](https://www.postman.com/downloads/)
  *~5 min · Install now so it's ready when the Postman sections start*

- [ ] **HTTP Status Cats** — memorable visual reference for status codes
  Browse: [http.cat](https://http.cat)
  *~2 min fun · e.g. http.cat/404, http.cat/200 — actually helps you remember them*

- [ ] **Hoppscotch** — free browser-based Postman alternative
  Try: [hoppscotch.io](https://hoppscotch.io)
  *~5 min · Useful if you prefer a web-based tool instead of the desktop app*

---

## Also useful

- [MDN — HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) — GET, POST, PUT, PATCH, DELETE explained
- [Postman Learning Center](https://learning.postman.com/docs/getting-started/overview/) — official Postman docs
- [TypeScript in 5 minutes](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) — not required, but useful context

---

> **You do NOT need** TypeScript experience, Jest experience, or prior API testing knowledge.
> This lecture starts from zero.
