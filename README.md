# chatty-api-tests

Hands-on API automation course: 18 lectures testing the Chatty social media REST API using Vitest, Axios, and TypeScript — no mocks, all tests run against the real production API.

---

## Quick Start

```bash
git clone <repo>
cd chatty-api-tests
npm install
cp .env.example .env  # fill in your credentials
npm test
```

---

## Prerequisites

- Node.js 18 or later
- A free account on [codeandtest.com](https://codeandtest.com) — your username must start with `vitest` (e.g. `vitestmike`)

---

## Project Structure

```
chatty-api-tests/
  src/
    config.ts            # BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL
    test-utils.ts        # expectRejected(), expectSuccess()
    fixtures.ts          # TEST_AVATAR_IMAGE, TEST_AVATAR_COLOR, TEST_PASSWORD, TEST_CLEANUP_SECRET
    interfaces.ts        # TypeScript interfaces for all API response shapes
  tests/
    lecture-01/          # Setup & First Test
    lecture-02/          #   lecture.test.ts
    ...                  #   homework/
    lecture-18/          #     starter.test.ts
                         #     solution.test.ts
                         #     postman-tasks.md
                         #     postman-solution.md
  docs/
    api-reference.md     # Endpoint reference
    api_automation.md    # Full course book
    course-guide.md      # All lecture READMEs in one file
    topics/              # 40 standalone reference files
  vitest.config.ts
  tsconfig.json
  .env.example
  STANDARDS.md
```

---

## Course Overview

| # | Title | Key concept |
|---|-------|-------------|
| 01 | Setup & First Test | Project setup, 8 assertion patterns, async/await |
| 02 | SignIn | Cookie capture, JWT, positive testing |
| 03 | SignUp | Faker.js, avatarImage, test cleanup lifecycle |
| 04 | Current User & Profile | State verification (PUT then GET), `afterAll` restore |
| 05 | Posts — Full CRUD | No ID on create, `postDeleted` flag, ObjectId validation |
| 06 | Reactions | 6 types, `encodeURIComponent(JSON.stringify(...))` DELETE param |
| 07 | Comments | POST returns 200 (not 201), full CRUD, GET-then-find |
| 08 | User Profile Search | Regex search, social links, change-password validation only |
| 09 | Followers & Notifications | Two-user scenario, unfollow needs both IDs |
| 10 | MongoDB | MongoClient, `findOne()`, cross-validation, read-only |
| 11 | CI/CD — GitHub Actions | YAML, matrix strategy, secrets, artifacts |
| 12 | Docker | Dockerfile for test runner, `.dockerignore`, docker-compose |
| 13 | Test Reporting | Vitest reporters, coverage, Newman CLI |
| 14 | Password Reset & SSO | Multi-step flows, testing partial flows, SSO via JWT |
| 15 | Posts with Media | Image/video upload, `postWithImageSchema`, filtered GET |
| 16 | User Profile Pages & Images | GET-heavy testing, 4 profile variants, image management |
| 17 | Chat & Messaging | Two-user conversation, `conversationId` lifecycle, delete message/conversation |
| 18 | Debugging & Test Reliability | Flaky test diagnosis, retry strategies, isolation patterns |

---

## Running Tests

```bash
# Run all tests
npm test

# Run a single lecture
npm test tests/lecture-02/lecture.test.ts

# Watch mode (re-runs on file save)
npm run test:watch

# With coverage report
npm run test:coverage
```

---

## Environment Setup

Copy `.env.example` to `.env` and fill in each value:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `BASE_URL` | API base URL | Use `https://api.codeandtest.com/api/v1` |
| `TEST_USERNAME` | Your test account username | Must start with `vitest` — register at codeandtest.com |
| `TEST_PASSWORD` | Your test account password | The password you chose at registration |
| `DATABASE_URL` | MongoDB connection string | Required from Lecture 10 only — provided in the lecture README |

`TEST_CLEANUP_SECRET` is not in `.env` — it is hardcoded in `src/fixtures.ts`.

---

## API Reference

- Interactive (Swagger UI): [https://api.codeandtest.com/api-docs](https://api.codeandtest.com/api-docs)
- Validation rules (machine-readable): `GET https://api.codeandtest.com/api/v1/schema`

---

## Docs

| File | Description |
|------|-------------|
| `docs/api-reference.md` | Living endpoint reference — fields, validation rules, error messages |
| `docs/api_automation.md` | The full course book (Parts I–VII + Appendices) |
| `docs/course-guide.md` | All 17 lecture READMEs concatenated into one file |
| `docs/topics/` | 40 standalone reference files, one per tool or concept (JWT, Axios, Faker, Docker, etc.) |

---

## Standards

See [STANDARDS.md](./STANDARDS.md) for coding standards and rules.

---

## Windows Users

All shell commands in this project are written for macOS and Linux. Windows users should run commands in **Git Bash** (included with Git for Windows) or **WSL2** — both support the standard syntax without modification. CMD and PowerShell alternatives are noted inline wherever commands differ.
