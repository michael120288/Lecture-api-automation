# Before Lecture 06 — Reactions — All Types & State Transitions

**Total prep time: ~15 min**

---

## Essential

- [ ] **URL encoding**
  Read: [MDN — encodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
  *~5 min · The DELETE reaction URL has JSON encoded as a path segment*
  `{` → `%7B` · `"` → `%22` · `:` → `%3A`

- [ ] **URL-safe characters**
  Read: [MDN — URL structure](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)
  *~5 min · Letters, numbers, `-`, `_`, `.` are safe. Curly braces and quotes are not.*

---

## Videos

- [ ] **URL encoding explained**
  Watch: https://www.youtube.com/watch?v=lkAeX3T6A9I
  *~7 min · Why browsers and APIs need to encode special characters in URLs*

---

## Interactive tools

- [ ] **URL encoder/decoder** — paste JSON and see the encoded result
  Try: [urlencoder.org](https://www.urlencoder.org)
  *~3 min · Paste `{"like":1,"love":0}` — see `%7B%22like%22%3A1%2C%22love%22%3A0%7D`*
  This is exactly what the DELETE reaction URL contains.

- [ ] **Percent-encoding reference** — all special characters and their codes
  Try: [developer.mozilla.org/en-US/docs/Glossary/Percent-encoding](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding)
  *~3 min skim · Bookmark for quick lookup*

---

## Also useful

- [RFC 3986 — URI encoding](https://datatracker.ietf.org/doc/html/rfc3986#section-2.1) — the formal specification
- [MDN — JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) — converting objects to strings before encoding

---

> **Key thing:** `encodeURIComponent(JSON.stringify(reactionsObject))` is the pattern.
> First convert the object to a JSON string. Then encode the string for URL safety.
