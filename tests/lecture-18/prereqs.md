# Before Lecture 18 — Debugging & Test Reliability

**Total prep time: ~15 min**

---

## Essential

- [ ] **How browsers and Node.js report errors**
  Read: [MDN — JavaScript error reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors)
  *~5 min · Learn to recognise TypeError, ReferenceError, and undefined access patterns — these are the errors you will see most often in failing tests*

- [ ] **Node.js debugging overview**
  Read: [Node.js — Debugging Getting Started](https://nodejs.org/en/learn/getting-started/debugging)
  *~5 min · Covers the `--inspect` flag, the Node.js inspector, and how to attach a debugger to a running process*

- [ ] **Vitest debugging docs**
  Read: [Vitest — Debugging](https://vitest.dev/guide/debugging)
  *~5 min · How to use `--reporter=verbose`, run a single file, and attach VS Code to a Vitest run*

---

## Videos

- [ ] **How to debug JavaScript** — The Coding Train or Fireship
  Watch: https://www.youtube.com/watch?v=H0XScE08hy8
  *~10 min · Covers console.log, breakpoints, reading stack traces — pick any 10-min result*

- [ ] **VS Code debugger tutorial**
  Watch: https://www.youtube.com/watch?v=2oFKNL7vYV8
  *~8 min · How to add a launch config and step through code line by line*

---

## Interactive tools

- [ ] **Node.js inspector**
  Try: Add `debugger;` to any test, then run:
  ```bash
  node --inspect-brk node_modules/.bin/vitest run tests/lecture-18/debugging.spec.ts
  ```
  Open `chrome://inspect` in Chrome. Click **Open dedicated DevTools for Node**.
  *~5 min · See exactly where execution pauses and what variables hold*

- [ ] **VS Code debugger setup**
  Try: Create `.vscode/launch.json` with a Vitest debug config (see Section 3 of the README).
  Set a breakpoint inside any `it()` block, then press F5.
  *~5 min · Step through a test line by line and inspect `res.data` in the Variables panel*

---

## Also useful

- [Vitest — `--reporter` docs](https://vitest.dev/guide/reporters) — all reporter options, including `verbose`, `json`, `junit`
- [Axios error handling](https://axios-http.com/docs/handling_errors) — why missing `validateStatus` causes a thrown error instead of a response
- [Node.js — `process.env`](https://nodejs.org/api/process.html#processenv) — how environment variables are loaded at runtime (relevant to Section 5)
- [dotenv docs](https://github.com/motdotla/dotenv#readme) — how `.env` is loaded by dotenv and passed through vitest.config.ts

---

> **No extra account needed for Lecture 18.**
> All tests sign in as `TEST_USERNAME`. No user B is created.
> The lecture file runs standalone without any setup beyond your `.env`.
