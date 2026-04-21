# Before Lecture 08 — User Profile Search, Social Links & Password

**Total prep time: ~10 min**

---

## Essential

- [ ] **Regular expressions basics**
  Read: [MDN — Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)
  *~10 min · The search endpoint uses case-insensitive regex to match usernames*
  `"vitest"` matches `"vitestmike"`, `"Vitestuser"`, `"VITESTJOHN"` because of the `i` flag.

---

## Videos

- [ ] **Regex crash course** — Web Dev Simplified
  Watch: Search YouTube → *"Regular expressions crash course Web Dev Simplified"*
  *~20 min · Covers character classes, flags (i = case-insensitive), groups*

---

## Interactive tools

- [ ] **Regex101** — test regex patterns live in the browser
  Try: [regex101.com](https://regex101.com)
  *~5 min · Type `vitest` as the pattern, enable `i` flag, test against `Vitestmike`, `VITESTUSER`*
  This is exactly what Chatty's search does server-side.

- [ ] **Regexr** — another visual regex tester with explanations
  Try: [regexr.com](https://regexr.com)
  *~5 min · Hover over regex parts to see what each piece matches*

---

## Also useful

- [MDN — String.match()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match) — how JavaScript uses regex
- [Regex cheat sheet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet) — MDN quick reference

---

> **Note on change-password:** The schema has `max: 8` characters — shorter than signup (min 12).
> We only test validation errors (empty body, mismatch) — never actually change the password.
