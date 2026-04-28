# Homework — Lecture 11: CI/CD — GitHub Actions Pipeline

> **Goal:** Set up and extend a GitHub Actions workflow that runs Vitest on every push — and add a second workflow that runs every night automatically.

---

## Core Tasks

Complete these first — they set up the foundation.

| Task | What it practices |
|------|------------------|
| 1 | Create `.github/workflows/tests.yml` from lecture section 3 |
| 2 | Add all 4 GitHub Secrets (BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL) |
| 3 | Push a commit — verify the Actions tab shows both Node 18 and Node 20 jobs passing |
| 4 | Trigger the workflow manually using the `workflow_dispatch` `chapter` input — run just one chapter |
| 5 | Add the status badge to your project README.md |

---

## Main Exercise — Scheduled Nightly Workflow

Create a second workflow file: `.github/workflows/scheduled.yml`.

This workflow runs **all tests automatically every night at midnight UTC** — without any push or PR trigger. It detects regressions caused by server-side changes (API updates, Redis restarts, database migrations) that would otherwise be invisible until someone manually runs the tests.

### Instructions

1. Open `tests/lecture-11/homework/starter.yml`
2. Fill in all 5 TODOs
3. Copy the completed file to `.github/workflows/scheduled.yml` in your repository root
4. Push and verify it appears in the Actions tab under **Nightly API Tests**

> The scheduled workflow does NOT run immediately on push — it only runs on its cron schedule. To test it manually, add `workflow_dispatch:` to the `on:` section, trigger it from the Actions tab, then remove `workflow_dispatch:` when you are done.

### Cron Syntax Reference

```
┌── minute (0–59)
│  ┌── hour (0–23, UTC)
│  │  ┌── day of month (1–31)
│  │  │  ┌── month (1–12)
│  │  │  │  ┌── day of week (0–6, Sunday=0)
*  *  *  *  *
```

| Expression | Meaning |
|------------|---------|
| `0 0 * * *` | Every day at midnight UTC |
| `0 6 * * 1` | Every Monday at 6am UTC |
| `0 */6 * * *` | Every 6 hours |
| `30 2 * * 0` | Every Sunday at 2:30am UTC |

### Why `retention-days: 14` instead of 7?

The main workflow uses 7 days — enough to investigate a recent failure.  
The nightly workflow uses 14 days — so you can compare two full weeks of runs side by side and spot trends (e.g. "tests started flaking 5 days ago").

### Solution

Once done — or stuck — open `tests/lecture-11/homework/solution.yml`.  
Read the explanation comments before comparing to your code.

---

## Stretch Tasks

These go beyond the lecture. Each requires reading, experimenting, and thinking independently.

### Stretch 1 — Path filter (only run when test files change)

Update the `on: push` section:

```yaml
on:
  push:
    branches: [master, develop]
    paths:
      - 'tests/**'
      - 'src/**'
      - 'vitest.config.ts'
      - 'package*.json'
  pull_request:
    branches: [master]
```

Push a commit that changes only `README.md`. Verify the workflow does NOT trigger.

**Why this matters:** Changing docs should not burn CI minutes. Path filters give you control over when tests are worth running.

---

### Stretch 2 — Unique per-run values to prevent parallel job collisions

The matrix runs Node 18 and Node 20 simultaneously — both jobs hit the same API and the same test account. If a test writes a hardcoded value to a shared field and reads it back, one job can overwrite the other's value before the read happens.

**Fix:** use `Date.now()` to make the written value unique per run:

```ts
// ❌ Both jobs write the same string
const testWork = 'QA Automation Engineer';

// ✅ Each job writes a unique string — only matches its own value on read-back
const run = Date.now();
const testWork = `QA Automation Engineer ${run}`;
```

Find a test in the course that writes to a shared account field (e.g. `work`, `quote`, social links). Apply the `Date.now()` pattern and verify both matrix jobs pass.

---

### Stretch 3 — `fail-fast: false` behaviour

The workflow already has `fail-fast: false`. To understand what it does:

1. Temporarily change it to `fail-fast: true`
2. Intentionally break one test
3. Push and observe: Node 18 fails → Node 20 is cancelled immediately
4. Revert to `fail-fast: false`, push again — both jobs run to completion

**When would you want each setting?**
- `fail-fast: true` — saves CI minutes: stop everything the moment something fails
- `fail-fast: false` — lets ALL matrix jobs finish: useful when you want the full picture

---

### Stretch 4 — Cache node_modules explicitly

The `cache: 'npm'` on `setup-node` caches the npm download cache, not `node_modules` itself. Add an explicit `node_modules` cache step:

```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ matrix.node-version }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-${{ matrix.node-version }}-

- name: Install dependencies
  run: npm ci
```

Compare run times before and after. The second push should be noticeably faster.

---

## Reflection Questions

Answer these in a comment on your PR or in a `homework-notes.md` file.

1. **Why does `npm ci` fail if `package-lock.json` is not committed to git?**
2. **What is the difference between `if: always()` and `if: failure()`? When would you use each?**
3. **What would happen if you put `TEST_PASSWORD: MyPassword123` directly in the YAML file instead of `${{ secrets.TEST_PASSWORD }}`?**
4. **The matrix creates two jobs. Can they share state (files, env vars) between them? Why or why not?**
5. **Why does the `concurrency` block use `${{ github.ref }}` instead of just `${{ github.workflow }}`?**

---

## How to Verify

Your homework is complete when:

- [ ] The Actions tab shows green ✅ for both Node 18 and Node 20 (tests.yml)
- [ ] The status badge in README shows passing
- [ ] The manual `chapter` input triggers only that chapter's test file
- [ ] `.github/workflows/scheduled.yml` exists and appears in the Actions tab
- [ ] You understand why `Date.now()` prevents parallel job collisions (Stretch 2)
- [ ] You can explain what `0 0 * * *` means without looking it up

---

## Git — Commit Your Homework

```bash
# Create a homework branch from the lecture branch
git checkout lecture-11-cicd
git checkout -b lecture-11-cicd-homework

# Add any config files you created or modified
git add .github/workflows/tests.yml
git status

# Commit
git commit -m "lecture-11: homework complete — CI/CD pipeline with stretch tasks"
git push -u origin lecture-11-cicd-homework
```

### Open a Pull Request

- Base branch: `lecture-11-cicd`
- Compare: `lecture-11-cicd-homework`
- Title: `lecture-11: homework complete — CI/CD pipeline`
- Include answers to the reflection questions in the PR description
