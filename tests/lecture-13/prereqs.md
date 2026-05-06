# Before Lecture 13 — Test Reporting — Vitest, Newman & Coverage

**Total prep time: ~15 min**

---

## Essential

- [ ] **Code coverage — what does it mean?**
  Read: [Atlassian — Code coverage explained](https://www.atlassian.com/continuous-delivery/software-testing/code-coverage)
  *~7 min · Line coverage, branch coverage — why 100% is not always the right goal*

- [ ] **JUnit XML format**
  Read: [Wikipedia — JUnit](https://en.wikipedia.org/wiki/JUnit)
  *~3 min · Machine-readable XML that CI/CD tools (Jenkins, GitHub Actions) parse*

- [ ] **Newman (Postman CLI)**
  Read: [Newman docs](https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/)
  *~5 min · Run Postman collections from terminal without the GUI*

---

## Videos

- [ ] **Code coverage explained** — visual guide
  Watch: https://www.youtube.com/watch?v=Ra42js3AXIQ
  *~10 min · Line coverage, branch coverage, what the coloured HTML report shows*

- [ ] **Newman — Postman CLI tutorial**
  Watch: https://www.youtube.com/watch?v=SQlwGZj97Y4
  *~10 min · Export collection, run with Newman, generate HTML report*

---

## Interactive tools

- [ ] **Vitest coverage report** — example output
  Try: Run `npm run test:coverage` after this lecture is set up
  *~2 min · Open `coverage/index.html` in a browser — green = covered, red = not*

- [ ] **Istanbul coverage docs** — the alternative coverage provider
  Read: [istanbul.js.org](https://istanbul.js.org)
  *~3 min · Understand why we chose `v8` over `istanbul` for this project*

---

## Also useful

- [Vitest — reporters documentation](https://vitest.dev/guide/reporters.html) — all built-in reporter options
- [newman-reporter-htmlextra](https://github.com/DannyDainton/newman-reporter-htmlextra) — the HTML reporter for Newman
- [JUnit XML schema](https://github.com/testmoapp/junitxml) — the exact XML format GitHub Actions reads

---

> **Before this lecture:** Export your Postman collection (JSON) and environment (JSON).
> Both files are needed for the Newman section.
