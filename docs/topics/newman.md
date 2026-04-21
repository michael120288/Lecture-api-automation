# Newman

## What Newman Is

Newman is the official command-line runner for Postman collections. It reads a Collection JSON file and an optional Environment JSON file, executes every request in order, runs all `pm.test()` assertions, and prints the results to your terminal.

The name comes from the character Newman in the TV show Seinfeld — a recurring antagonist who nevertheless gets things done.

Newman is a Node.js package maintained by Postman. It lives on npm at `newman`. You install it once and call it from any directory.

---

## Why Newman Over the Postman UI for CI

The Postman GUI is excellent for building and debugging requests interactively. But it has one major limitation: it requires a human to click **Run**. You cannot trigger the Postman UI from a GitHub Actions pipeline or a cron job.

Newman is the bridge between your Postman work and automated pipelines.

| Comparison point | Postman UI | Newman |
|---|---|---|
| Requires a running desktop app | Yes | No |
| Can run in GitHub Actions | No | Yes |
| Output parseable by scripts | No | Yes (JSON, JUnit, HTML) |
| Speed for large collections | Limited by UI render | Fast (headless) |
| Shareable with any developer | Needs Postman installed | Just Node.js |
| Parallel execution across environments | Manual effort | Scriptable |

In this course, Newman bridges the gap between your manual Postman exploration and the fully automated Vitest suite. It is a useful intermediate step for teams that have invested heavily in Postman but want CI integration before migrating to code-based tests.

---

## Installing Newman

### Install Newman globally

Global installation makes the `newman` command available in any terminal session.

```bash
npm install -g newman
```

Verify the installation:

```bash
newman --version
# 6.1.3  (or similar)
```

### Install the htmlextra reporter

The default Newman output is plain text. `newman-reporter-htmlextra` generates a rich HTML report with pass/fail summaries, response bodies, timing charts, and request/response details.

```bash
npm install -g newman-reporter-htmlextra
```

Verify:

```bash
newman run --help | grep reporter
```

### Install as a project dev dependency (alternative)

If you want Newman pinned to a specific version in the project and run via `npm test`:

```bash
npm install --save-dev newman newman-reporter-htmlextra
```

Then in `package.json`:

```json
{
  "scripts": {
    "test:postman": "newman run chatty-collection.json -e chatty-environment.json"
  }
}
```

---

## The Basic newman run Command

```bash
newman run <collection-file> [options]
```

Minimum viable command:

```bash
newman run chatty-collection.json
```

With an environment file:

```bash
newman run chatty-collection.json \
  --environment chatty-environment.json
```

If your collection file is in a subdirectory:

```bash
newman run ./postman/chatty-collection.json \
  --environment ./postman/chatty-environment.json
```

---

## Key Flags

### --environment / -e

Load an Environment JSON file exported from Postman:

```bash
newman run chatty-collection.json --environment chatty-environment.json
```

Short form:

```bash
newman run chatty-collection.json -e chatty-environment.json
```

### --env-var

Override or inject individual environment variables directly from the command line, without modifying the environment file. Useful in CI when secrets should not be stored in files.

```bash
newman run chatty-collection.json \
  -e chatty-environment.json \
  --env-var "BASE_URL=https://staging.api.codeandtest.com/api/v1" \
  --env-var "TEST_SECRET=supersecretvalue"
```

The `--env-var` flag takes precedence over the corresponding value in the environment JSON.

### --reporters

Choose output reporters. Separate multiple reporters with commas.

```bash
# Terminal output only (default)
newman run chatty-collection.json -e chatty-environment.json --reporters cli

# Terminal output plus HTML report
newman run chatty-collection.json -e chatty-environment.json \
  --reporters cli,htmlextra
```

Available built-in reporters: `cli`, `json`, `junit`

### --reporter-htmlextra-export

Specify the file path for the HTML report output:

```bash
newman run chatty-collection.json \
  -e chatty-environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export ./reports/chatty-report.html
```

If the `reports` directory does not exist, Newman creates it.

### --delay-request

Add a delay (in milliseconds) between each request. Useful when hitting a rate-limited API.

```bash
newman run chatty-collection.json \
  -e chatty-environment.json \
  --delay-request 500
```

This adds a 500ms pause between requests.

### --iteration-count / -n

Run the entire collection multiple times. Useful for load testing or data-driven tests.

```bash
# Run the collection 3 times
newman run chatty-collection.json \
  -e chatty-environment.json \
  --iteration-count 3
```

Combine with `--iteration-data` to load different variables per iteration (CSV or JSON file).

### --bail

Stop the entire Newman run as soon as a request or assertion fails. By default, Newman continues running after a failure.

```bash
newman run chatty-collection.json \
  -e chatty-environment.json \
  --bail
```

In CI pipelines, `--bail` makes sense for fast feedback: no point running 40 more requests if authentication failed at step 1.

### --folder

Run only a specific folder within the collection:

```bash
newman run chatty-collection.json \
  -e chatty-environment.json \
  --folder "Auth"
```

### --timeout-request

Set the maximum time (ms) to wait for a single request to complete:

```bash
newman run chatty-collection.json \
  -e chatty-environment.json \
  --timeout-request 5000
```

---

## The Terminal Output Format

When Newman runs, the CLI output looks like this:

```
chatty-api-tests

Auth
  POST Signup
    [200 ms] Status code is 201 Created
    [200 ms] Response has user object
    [200 ms] User does not expose password

  POST Signin
    [180 ms] Status code is 200 OK
    [180 ms] Response includes token
    [180 ms] Response includes user profile

  DELETE Signout
    [150 ms] Status code is 200 OK

Posts
  GET All Posts
    [95 ms] Status code is 200 OK
    [95 ms] Posts is an array

  ...

Summary
  total run duration: 4.2s
  total data received: 12.4KB
  average response time: 162ms

Iterations:              1
Requests:               12
Test Scripts:           12
Pre-request Scripts:    3
Assertions:             31

  passed:              29
  failed:               2
  skipped:              0
```

Exit code is `0` if all tests pass, `1` if any tests fail. CI pipelines use this exit code to mark a build as passed or failed.

---

## The htmlextra HTML Report

The htmlextra reporter generates a self-contained HTML file (no external dependencies). Open it in any browser.

### What the report shows

| Section | Content |
|---|---|
| **Summary banner** | Total requests, pass count, fail count, duration |
| **Collection overview** | Tree of folders and requests with status icons |
| **Per-request detail** | Method, URL, status code, response time, response size |
| **Request body** | The exact body sent |
| **Response body** | The full response body, syntax highlighted |
| **Test results** | Each `pm.test()` with PASS/FAIL status and assertion message |
| **Pre-request scripts** | Script text |
| **Console logs** | Any `console.log()` output |
| **Timing chart** | Bar chart of response times per request |

### Opening the report

After the Newman run completes:

```bash
open ./reports/chatty-report.html      # macOS
start ./reports/chatty-report.html     # Windows
xdg-open ./reports/chatty-report.html # Linux
```

---

## Exporting from Postman for Newman

Newman needs two files: the Collection JSON and the Environment JSON.

### Export the Collection

1. In Postman, click the `...` menu on your collection
2. Click **Export**
3. Select **Collection v2.1** — Newman requires v2.1, not v2.0
4. Save the file (e.g. `chatty-collection.json`)

### Export the Environment

1. In Postman, go to the **Environments** panel
2. Click `...` on the environment
3. Click **Export**
4. Save as `chatty-environment.json`

### Clean the environment file before exporting

Sensitive values (tokens, passwords) stored in **Current Value** are included in the exported JSON. Either:

- Clear sensitive Current Values before exporting, or
- Use `--env-var` in the Newman command to inject secrets from CI environment variables

Never commit a raw environment file containing secrets to git.

---

## Full Annotated Newman Command for the Chatty Collection

This is the full command used in this course. Each flag is annotated.

```bash
newman run ./postman/chatty-collection.json \
  --environment ./postman/chatty-environment.json \
  --env-var "BASE_URL=https://api.codeandtest.com/api/v1" \
  --env-var "TEST_SECRET=$TEST_SECRET" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export ./reports/chatty-$(date +%Y%m%d-%H%M%S).html \
  --delay-request 300 \
  --bail
```

| Flag | What it does |
|---|---|
| `./postman/chatty-collection.json` | Path to the exported Postman collection |
| `--environment` | Path to the exported environment file |
| `--env-var "BASE_URL=..."` | Override BASE_URL (useful to target staging vs production) |
| `--env-var "TEST_SECRET=$TEST_SECRET"` | Inject secret from shell env var (set in CI secrets) |
| `--reporters cli,htmlextra` | Show terminal output AND generate HTML report |
| `--reporter-htmlextra-export ...` | Save HTML report with a timestamped filename |
| `--delay-request 300` | 300ms between requests to avoid rate limiting |
| `--bail` | Stop on first failure |

---

## Running Newman in GitHub Actions

Create `.github/workflows/postman-tests.yml`:

```yaml
name: Postman / Newman Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  newman:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Newman and htmlextra reporter
        run: |
          npm install -g newman newman-reporter-htmlextra
> **Windows users:** If `newman` is not found after global install, run the terminal as Administrator,
> or use `npx newman` instead — no global install needed.

> **Windows users:** If `newman` is not found after global install, run the terminal as Administrator,
> or skip the global install entirely and use `npx newman` and `npx newman-reporter-htmlextra` instead.


      - name: Run Newman
        env:
          TEST_SECRET: ${{ secrets.TEST_SECRET }}
        run: |
          newman run ./postman/chatty-collection.json \
            --environment ./postman/chatty-environment.json \
            --env-var "BASE_URL=https://api.codeandtest.com/api/v1" \
            --env-var "TEST_SECRET=$TEST_SECRET" \
            --reporters cli,htmlextra \
            --reporter-htmlextra-export ./reports/chatty-report.html \
            --delay-request 300 \
            --bail

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: newman-report
          path: ./reports/chatty-report.html
```

Key points:

- The `TEST_SECRET` is stored in GitHub repository **Secrets** (Settings > Secrets and variables > Actions), never in the YAML file
- `if: always()` on the upload step means the report is uploaded even when Newman fails — you want to see the report especially when there are failures
- The `--env-var "TEST_SECRET=$TEST_SECRET"` syntax interpolates the shell environment variable set by the `env:` block

---

## Environment Variable Override from CLI

The `--env-var` flag lets you override any variable from the environment file without editing the file. The CLI value takes precedence.

```bash
# Use staging URL instead of production
newman run chatty-collection.json \
  -e chatty-environment.json \
  --env-var "BASE_URL=https://staging.api.codeandtest.com/api/v1"

# Override multiple variables
newman run chatty-collection.json \
  -e chatty-environment.json \
  --env-var "BASE_URL=https://staging.api.codeandtest.com/api/v1" \
  --env-var "TEST_SECRET=staging-secret-value"
```

This is how the same collection and environment file can target different deployments without modification.

---

## Running Newman Locally vs in CI

| Aspect | Local run | CI run |
|---|---|---|
| Command is the same | Yes | Yes |
| Environment file contains secrets | Sometimes (Current Value) | No — inject via `--env-var` |
| Secrets source | Your local file or shell export | GitHub Actions Secrets / CI env vars |
| HTML report | Opened manually | Uploaded as build artifact |
| Exit code checked | Optional | Pipeline fails on exit code 1 |
| Node.js version | Whatever is installed locally | Pinned in workflow file |

Best practice: keep your local and CI Newman commands identical except for the source of secrets. This eliminates "it works on my machine" issues.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Using Collection v2.0 export | `Error: collection format v2.0 is not supported` | Re-export from Postman choosing v2.1 |
| Environment file has blank values | Variables resolve to empty string | Check Current Value in Postman, or use `--env-var` to inject |
| `newman` not found after `npm install` | `command not found: newman` | Use `npm install -g newman` or run via `npx newman` |
| `--bail` stops collection mid-way | First failing test halts everything | Expected behavior; useful in CI but disable locally when debugging |
| Committing environment file with tokens | Secrets leaked in git history | Clear Current Values before export; use `--env-var` for secrets |
| Reports directory not created | Newman run fails trying to write report | Newman auto-creates the directory; verify the path is relative to where you run Newman |
| `htmlextra` reporter not found | `Error: No reporter found with name 'htmlextra'` | Run `npm install -g newman-reporter-htmlextra` |

---

## Related Topics

- [Postman](postman.md) — build and export the collections that Newman runs
- [CLI Basics](cli-basics.md) — understanding the terminal commands used with Newman
- [npm Commands](npm-commands.md) — install and manage Newman as a package
- [Git Commands](git-commands.md) — commit your collection files and CI workflow

## Official Documentation

- [Newman — Official docs](https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/)
- [Newman GitHub](https://github.com/postmanlabs/newman)
- [newman-reporter-htmlextra GitHub](https://github.com/DannyDainton/newman-reporter-htmlextra)
