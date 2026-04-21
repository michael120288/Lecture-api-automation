# Homework — Lecture 11: CI/CD — GitHub Actions Pipeline

> **Goal:** Set up and extend a GitHub Actions workflow that runs Vitest on every push.

---

## Core Tasks

Complete these first — they set up the foundation.

| Task | What it practices |
|------|------------------|
| 1 | Create `.github/workflows/tests.yml` from lecture section 5 |
| 2 | Add all 4 GitHub Secrets (BASE_URL, TEST_USERNAME, TEST_PASSWORD, DATABASE_URL) |
| 3 | Push a commit — verify the Actions tab shows both Node 18 and Node 20 jobs passing |
| 4 | Add JUnit reporter to `vitest.config.ts`, verify `test-results/junit.xml` is uploaded |
| 5 | Add the status badge to your project README.md |

---

## Stretch Tasks

These go beyond the lecture. Each requires reading, experimenting, and thinking independently.

### Stretch 1 — Concurrency group (cancel outdated runs)

Add this block to your workflow file, directly under the `on:` section:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Push two commits in quick succession. Check the Actions tab — the first run should be cancelled automatically.

**Why this matters:** Without a concurrency group, every push queues a new run. On a busy branch you can have 10 runs queued. The concurrency group cancels the old one the moment a new push arrives.

---

### Stretch 2 — Path filter (only run when test files change)

Update the `on: push` section:

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - 'tests/**'
      - 'src/**'
      - 'vitest.config.ts'
      - 'package*.json'
  pull_request:
    branches: [main]
```

Push a commit that changes only `README.md`. Verify the workflow does NOT trigger.

**Why this matters:** Changing docs should not burn CI minutes. Path filters give you control over when tests are worth running.

---

### Stretch 3 — Manual trigger with lecture input

Add `workflow_dispatch` with an input so you can run a single lecture from the GitHub UI:

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      lecture:
        description: 'Lecture folder to run (e.g. lecture-02) — leave blank for all'
        required: false
        default: ''
```

Then update the Run Vitest step:

```yaml
- name: Run Vitest
  run: |
    if [ -n "${{ github.event.inputs.lecture }}" ]; then
      npm test tests/${{ github.event.inputs.lecture }}/lecture.test.ts
    else
      npm test
    fi
```

Go to the Actions tab → select the workflow → click **Run workflow** → type `lecture-02` in the input. Verify only that lecture runs.

---

### Stretch 4 — `fail-fast: false` in the matrix

By default, if Node 18 fails the Node 20 job is cancelled immediately. Add:

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: [18, 20]
```

**When would you want this?**
- `fail-fast: true` (default) — saves CI minutes: stop everything the moment something fails
- `fail-fast: false` — lets ALL matrix jobs finish: useful when you want the full picture (maybe Node 18 fails but Node 20 passes — that's important information)

No push needed — just update the file and explain your reasoning in the PR description.

---

### Stretch 5 — Cache node_modules explicitly

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
5. **When a PR is opened, both `push` and `pull_request` triggers could fire. Which one actually fires, and why?**

---

## How to Verify

Your homework is complete when:

- [ ] The Actions tab shows green ✅ for both Node 18 and Node 20
- [ ] The status badge in README shows passing
- [ ] `test-results/junit.xml` appears as a downloadable artifact
- [ ] Pushing to a non-matching path does NOT trigger the workflow (Stretch 2)
- [ ] The manual trigger input works (Stretch 3)

---

## Git — Commit Your Homework

```bash
# Create a homework branch from the lecture branch
git checkout lecture-11-cicd
git checkout -b lecture-11-cicd-homework

# Add any config files you created or modified
git add .github/workflows/tests.yml vitest.config.ts
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
