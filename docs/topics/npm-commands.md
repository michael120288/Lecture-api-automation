# npm Commands

## What npm Is

**npm** stands for Node Package Manager. It is the default package manager for Node.js. When you install Node.js, npm is installed alongside it automatically.

npm does two things:

1. **Manages dependencies** — downloads, installs, and tracks the third-party libraries (packages) your project uses
2. **Runs scripts** — executes commands defined in your `package.json` file, like running tests or building the project

The npm registry at [npmjs.com](https://www.npmjs.com) hosts over two million packages. Every package in this course — `vitest`, `axios`, `typescript`, `newman` — is downloaded from that registry.

---

## The package.json File

Every Node.js project has a `package.json` file at its root. It is a JSON file that describes the project and its configuration.

### A real package.json from this course

```json
{
  "name": "chatty-api-tests",
  "version": "1.0.0",
  "description": "QA automation course — Vitest + Axios + TypeScript",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --reporter=verbose --reporter=junit --outputFile=./reports/results.xml"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.11.0",
    "axios": "^1.6.7",
    "dotenv": "^16.4.1",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2",
    "@vitest/coverage-v8": "^1.2.2"
  }
}
```

### Key fields explained

| Field | Purpose |
|---|---|
| `name` | The package name. Used when publishing to npm. For private projects, just a label. |
| `version` | Semantic version of the project (`major.minor.patch`). |
| `scripts` | Named commands you can run with `npm run <name>`. |
| `dependencies` | Packages needed at runtime (in production). |
| `devDependencies` | Packages needed only during development and testing. |

### Why dependencies vs devDependencies matters

In this course, everything is a `devDependency` because the project is a test suite — there is no production runtime to deploy. The distinction matters for:

- Production Docker images (you install `--omit=dev` to keep the image small)
- Library authors (users of your library should not need your test tools)

For a QA automation project like `chatty-api-tests`, you will almost always use `--save-dev`.

---

## The package-lock.json File

When you run `npm install`, npm creates (or updates) `package-lock.json`. This file records the **exact version** of every installed package, including all transitive dependencies (dependencies of your dependencies).

### Why it exists

Say your `package.json` specifies `"vitest": "^1.2.2"`. The `^` means "accept any compatible version >= 1.2.2 and < 2.0.0". If you install today, you might get `1.2.2`. If a teammate installs next month, they might get `1.5.0`. The behavior could differ.

`package-lock.json` pins every package to its exact resolved version. When npm sees a lock file, it installs exactly those versions — no surprises.

### Should you commit package-lock.json to git?

**Yes, always.** Commit `package-lock.json` so every developer and every CI run installs exactly the same versions. This is a firm rule in professional projects.

---

## The node_modules Directory

When you run `npm install`, all packages are downloaded into the `node_modules` directory at the project root.

### Never commit node_modules

`node_modules` is enormous (often hundreds of megabytes) and completely reproducible from `package.json` + `package-lock.json`. It does not belong in git.

Your `.gitignore` in this course already contains:

```
node_modules/
```

If you ever accidentally commit `node_modules`, ask an instructor for help cleaning it from git history.

---

## Every npm Command Used in the Course

### npm init

Initializes a new `package.json` in the current directory. It asks you a series of questions (name, version, description, etc.).

```bash
$ npm init
```

### npm init -y

Same as `npm init` but skips all questions and accepts defaults. The `-y` flag means "yes to everything."

```bash
$ npm init -y
```

This creates a minimal `package.json` instantly. You then edit it to add scripts and dependencies.

---

### npm install package (adds to dependencies)

Installs a package and adds it to `dependencies` in `package.json`.

```bash
$ npm install express
```

Use this for packages your application needs at runtime. In a QA test project this is rarely the right choice.

---

### npm install package --save-dev (adds to devDependencies)

Installs a package and adds it to `devDependencies` in `package.json`. The `--save-dev` flag can be shortened to `-D`.

```bash
$ npm install --save-dev vitest
$ npm install --save-dev axios
$ npm install --save-dev typescript
$ npm install --save-dev dotenv

# Short form
$ npm install -D vitest
```

For the course project setup in one command:

```bash
$ npm install -D vitest axios typescript @types/node dotenv @vitest/coverage-v8
```

---

### npm install -g package (global install)

Installs a package globally so it is available as a command in any directory on your system.

```bash
$ npm install -g newman
$ npm install -g newman-reporter-htmlextra
$ npm install -g typescript
```

After a global install, the command is available system-wide:

```bash
$ newman --version
$ tsc --version
```

**When to use global vs local:**

| Scenario | Use |
|---|---|
| CLI tool you run directly (newman, tsc) | Global or npx |
| Library used inside your project code | Local (devDependency) |
| Tool pinned to a specific version per project | Local |

---

### npm install (install all from package.json)

When you clone a repository, the `node_modules` directory is not included (it is in `.gitignore`). Run `npm install` (or `npm i` for short) to download all packages listed in `package.json`.

```bash
# After cloning the course repo
$ cd chatty-api-tests
$ npm install
```

If `package-lock.json` exists, npm will read it and install exactly the locked versions.

---

### npm ci (clean install from lock file)

`npm ci` is the recommended command for CI environments and for getting a clean, reproducible install.

Differences from `npm install`:

| Behavior | `npm install` | `npm ci` |
|---|---|---|
| Uses lock file | Yes (if present) | Requires it (fails if missing) |
| Updates lock file | Possibly | Never — read-only |
| Deletes node_modules first | No | Yes — always starts clean |
| Speed | Slower | Faster (skips resolution) |
| Use case | Development | CI pipelines, Docker builds |

```bash
$ npm ci
```

In GitHub Actions:

```yaml
- name: Install dependencies
  run: npm ci
```

---

### npm run scriptname

Runs a named script from the `scripts` section of `package.json`.

```bash
$ npm run test:coverage
$ npm run test:ci
$ npm run test:watch
```

### npm test

`npm test` is a shorthand for `npm run test`. It is one of npm's built-in shortcuts alongside `npm start` and `npm stop`. You do not need to type `run`.

```bash
# These are identical
$ npm run test
$ npm test
```

---

## The scripts Section of This Course's package.json

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ci": "vitest run --reporter=verbose --reporter=junit --outputFile=./reports/results.xml"
}
```

| Script | Command | When to use |
|---|---|---|
| `npm test` | `vitest run` | Run all tests once and exit. Use for a quick check. |
| `npm run test:watch` | `vitest` | Run tests in watch mode — re-runs on every file save. Use during development. |
| `npm run test:coverage` | `vitest run --coverage` | Run tests and generate a code coverage report. |
| `npm run test:ci` | `vitest run --reporter=verbose --reporter=junit ...` | CI-optimized run: verbose output + JUnit XML report for CI dashboards. |

---

## Running a Specific Test File

You can pass a file path as an argument to `npm test` and Vitest will only run that file.

```bash
# Run only lecture 02 tests
$ npm test tests/lecture-02/lecture.test.ts

# Run only the homework solution
$ npm test tests/lecture-02/homework/solution.test.ts

# Run all files in a lecture directory (glob)
$ npm test tests/lecture-02/
```

This uses Vitest's file filtering. The path is passed through to the `vitest run` command.

---

### npm uninstall package

Removes a package from `node_modules` and from `package.json`.

```bash
$ npm uninstall axios
```

Remove from devDependencies:

```bash
$ npm uninstall --save-dev axios
```

---

### npx command (run without global install)

`npx` downloads and runs a package without permanently installing it globally. It is included with npm.

```bash
# Run newman without a global install
$ npx newman run chatty-collection.json -e chatty-environment.json

# Run tsc (TypeScript compiler) without global install
$ npx tsc --noEmit

# Run vitest directly
$ npx vitest run
```

When you run `npx <package>`, npm checks if the package is already installed locally or globally. If not, it downloads a temporary copy, runs it, and removes it. This keeps your global namespace clean.

**Use `npx` when:**
- You want to run a CLI tool once without installing it permanently
- You want to ensure you are running the locally-installed version (not a globally-installed older one)

---

### npm outdated

Lists packages that have newer versions available.

```bash
$ npm outdated
Package    Current  Wanted  Latest  Location
axios        1.6.7   1.6.7   1.7.2  chatty-api-tests
vitest       1.2.2   1.2.2   1.6.0  chatty-api-tests
```

| Column | Meaning |
|---|---|
| Current | The version you have installed |
| Wanted | The latest version satisfying your `package.json` range |
| Latest | The absolute latest version on npm |

### npm update

Updates packages to the latest version within your `package.json` version range.

```bash
$ npm update
```

This does not upgrade major versions. To upgrade major versions, you need to edit `package.json` manually or use a tool like `npm-check-updates`.

---

## Version Numbers and Ranges

npm uses **semantic versioning** (semver): `major.minor.patch`

- `major` — breaking changes
- `minor` — new features, backwards compatible
- `patch` — bug fixes

Version ranges in `package.json`:

| Range | Meaning |
|---|---|
| `"1.2.2"` | Exactly 1.2.2 |
| `"^1.2.2"` | >= 1.2.2 and < 2.0.0 (same major) |
| `"~1.2.2"` | >= 1.2.2 and < 1.3.0 (same minor) |
| `"*"` | Any version (dangerous — avoid) |

The `^` (caret) is the default range when you run `npm install`. It allows minor and patch upgrades but not major version bumps.

---

## What Happens When You Run npm test tests/lecture-02/lecture.test.ts

Let's trace exactly what happens step by step:

1. npm reads `package.json` and finds the `"test"` script: `"vitest run"`
2. npm prepends `node_modules/.bin` to the PATH, so the locally installed `vitest` binary is found
3. npm executes: `vitest run tests/lecture-02/lecture.test.ts`
4. Vitest finds the test file, reads `vitest.config.ts` (or infers config from `package.json`)
5. Vitest loads your test file, imports the `describe`, `it`, `expect` functions
6. Vitest runs each `describe` block, executes each `it` / `test` callback
7. Vitest prints results: pass/fail counts, duration, errors with stack traces
8. Vitest exits with code `0` (all pass) or `1` (any fail)
9. npm exits with the same code

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Running `npm install` inside the wrong directory | `package.json` not found | `cd` to the project root first; verify with `pwd` |
| Forgetting `--save-dev` when installing test tools | Package goes into `dependencies` instead of `devDependencies` | Uninstall and reinstall with `--save-dev` |
| Committing `node_modules` | Huge git repo, slow pushes | Add `node_modules/` to `.gitignore`, then remove it from tracking |
| Running `npm ci` when there is no `package-lock.json` | `npm ci` can only install with an existing lockfile` | Run `npm install` first to generate the lock file |
| Using `npm install` in CI instead of `npm ci` | Non-deterministic installs, lock file may be updated | Use `npm ci` in all CI pipelines |
| Global package not found after `npm install -g` | `command not found: newman` | Check `npm config get prefix` and verify that directory is on your PATH |
| Running `npm test path/to/file` and nothing happens | Vitest does not know the path argument | Make sure the `test` script in `package.json` uses `vitest run` (not `vitest run --watch`) |
| `npm run test:watch` freezes the terminal | That is correct — watch mode is interactive and does not exit | Press `q` to quit watch mode |

---

## Related Topics

- [CLI Basics](cli-basics.md) — terminal commands used to run npm
- [Git Commands](git-commands.md) — track your package.json changes in git
- [Newman](newman.md) — install and run Newman with npm

## Official Documentation

- [npm — Official docs](https://docs.npmjs.com/)
- [npm — CLI reference](https://docs.npmjs.com/cli/v10/commands)
- [npm — package.json fields](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Node.js — npm ci vs install](https://docs.npmjs.com/cli/v10/commands/npm-ci)
