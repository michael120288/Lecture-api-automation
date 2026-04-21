# Git Commands

## What Git Is

Git is a **version control system**. It tracks every change you make to files over time, so you can see what changed, when it changed, who changed it, and why.

Without version control, collaborating on code means emailing files back and forth, or overwriting each other's work. Git solves this by giving every developer a complete local copy of the project history, and providing tools to merge work together.

Git is free, open source, and the industry standard. Every professional software project uses it.

---

## Core Concepts

### Repository (repo)

A **repository** is a directory that git is tracking. It contains:

- All your project files
- A hidden `.git` folder that stores the entire history

When you run `git init` or `git clone`, you create a repository.

### Commit

A **commit** is a saved snapshot of your files at a point in time. Every commit has:

- A unique ID (a 40-character hash, like `a3f7c2d...`)
- A commit message describing the change
- The author's name and email
- A timestamp
- A reference to the previous commit (the parent)

Think of commits as save points in a video game. You can always go back.

### Branch

A **branch** is an independent line of development. The default branch is called `main` (older projects may use `master`).

When you create a branch, you get your own copy of the project to work on. Changes on your branch do not affect `main` until you explicitly merge them.

### The Staging Area

Git has three zones:

| Zone | What it holds |
|---|---|
| **Working directory** | Your files as they are right now |
| **Staging area (index)** | Changes you have marked to include in the next commit |
| **Repository** | The saved commits (history) |

The workflow is:
1. Edit files (working directory changes)
2. `git add` specific files (stage them)
3. `git commit` (save everything staged as a new commit)

This two-step process lets you make many changes but commit only some of them.

---

## Every Git Command Used in the Course

### git init

Initializes a new git repository in the current directory. Creates the hidden `.git` folder.

```bash
$ cd chatty-api-tests
$ git init
Initialized empty Git repository in /Users/michael120288/WebstormProjects/fullStack/theProject/chatty-api-tests/.git/
```

You only run `git init` once when starting a new project from scratch. When you clone an existing repo, it is already initialized.

---

### git clone url

Downloads a remote repository to your local machine. It creates a new directory with the project name.

```bash
$ git clone https://github.com/your-org/chatty-api-tests.git
```

After cloning:

```bash
$ cd chatty-api-tests
$ npm install    # install dependencies not included in git
```

---

### git status

Shows the current state of your working directory and staging area. Run this constantly — it tells you exactly what has changed and what is staged.

```bash
$ git status
On branch lecture-02-setup
Your branch is up to date with 'origin/lecture-02-setup'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   tests/lecture-02/lecture.test.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        tests/lecture-02/homework/solution.test.ts

nothing added to commit but untracked files present (use "git add" to track)
```

**Reading the output:**

| Status | Meaning |
|---|---|
| `modified: filename` | File exists in git and you have changed it, but not staged it |
| `new file: filename` | File is staged (added) and will be included in the next commit |
| `deleted: filename` | File was deleted, change not yet staged |
| Untracked | File exists on disk but git has never tracked it; not staged |

---

### git add

Moves changes from the working directory to the staging area.

```bash
# Stage a specific file
$ git add tests/lecture-02/lecture.test.ts

# Stage multiple specific files
$ git add tests/lecture-02/lecture.test.ts tests/lecture-02/README.md

# Stage all changes in a directory
$ git add tests/lecture-02/

# Stage all changes in the entire project
$ git add .
```

**Be careful with `git add .`** — it stages everything, including files you may not want to commit (`.env`, temporary files). Use `git status` first to review what is pending.

---

### git commit -m "message"

Creates a new commit with everything in the staging area. The `-m` flag lets you provide the message inline.

```bash
$ git commit -m "add lecture-02 signup and signin tests"
```

If you forget `-m`, git opens your default text editor for you to write the message. Press `Ctrl+X` (nano) or `:wq` (vim) to save and exit.

### Good commit message format

A good commit message answers: *what did you do, and why?*

**Rules:**
- Use the imperative mood: "add test", not "added test" or "adding test"
- Keep the subject line under 72 characters
- Capitalize the first word
- Do not end with a period
- Be specific — avoid "fix stuff" or "update file"

**Examples from this course:**

```bash
# Good
git commit -m "add lecture-02 auth tests for signup and signin"
git commit -m "fix cleanup test to use correct authId from signup response"
git commit -m "add homework starter with TODO comments for lecture-03"
git commit -m "update BASE_URL env variable name to match course config"

# Bad
git commit -m "stuff"
git commit -m "fix"
git commit -m "WIP"
git commit -m "Changed things"
```

---

### git push

Sends your local commits to the remote repository (GitHub).

```bash
# Push the current branch to the remote
$ git push

# Push and set the upstream tracking reference (use when pushing a new branch for the first time)
$ git push -u origin lecture-02-setup

# Push a specific branch
$ git push origin lecture-02-setup
```

**`-u` flag:** Sets the upstream so that future `git push` and `git pull` commands on this branch work without specifying the remote name and branch name.

```bash
# First push of a new branch
$ git push -u origin lecture-03-posts

# Subsequent pushes — just this
$ git push
```

---

### git pull origin main

Downloads changes from the remote and merges them into your current branch.

```bash
# Pull from origin/main into your current branch
$ git pull origin main

# Pull from the tracked upstream (after -u is set)
$ git pull
```

Run `git pull origin main` to bring your branch up to date with the main branch before creating a pull request.

---

### git checkout -b new-branch

Creates a new branch and switches to it in one command. The `-b` flag means "create".

```bash
$ git checkout -b lecture-03-posts
Switched to a new branch 'lecture-03-posts'
```

**Always create a new branch for each lecture.** Never do your lecture work directly on `main`.

---

### git checkout existing-branch

Switches to an already-existing branch. No `-b` flag.

```bash
$ git checkout main
Switched to branch 'main'
Your branch is up to date with 'origin/main'.

$ git checkout lecture-02-setup
Switched to branch 'lecture-02-setup'
```

If you have uncommitted changes in the working directory that conflict with the branch you are switching to, git will warn you or refuse to switch. Commit or stash your changes first.

---

### git branch

Lists all local branches. The current branch is marked with `*`.

```bash
$ git branch
  main
* lecture-03-posts
  lecture-02-setup
  lecture-01-setup
```

### git branch -d branchname

Deletes a local branch. The `-d` flag is safe — it refuses to delete a branch that has unmerged commits. Use `-D` to force delete.

```bash
# Safe delete (refuses if unmerged)
$ git branch -d lecture-01-setup

# Force delete
$ git branch -D lecture-01-setup-wip
```

---

### git merge branchname

Merges the named branch into your current branch.

```bash
# Merge lecture-02-setup into main
$ git checkout main
$ git merge lecture-02-setup
```

In this course, you will rarely merge locally. Instead you push your branch and open a Pull Request on GitHub. The merge happens on GitHub after review.

---

### git log --oneline

Shows commit history, one line per commit. Most recent commit is at the top.

```bash
$ git log --oneline
f3a1c7d (HEAD -> lecture-03-posts, origin/lecture-03-posts) add GET all posts test
a2e9b44 add POST create post test with cleanup
7c8d2f1 (origin/lecture-02-setup) add lecture-02 auth tests
3b6f5e0 add lecture-01 project setup and health check test
0a1d4c2 (origin/main, main) initial project scaffold
```

Reading the output:

| Part | Meaning |
|---|---|
| `f3a1c7d` | Short hash (first 7 characters of the full 40-char hash) |
| `(HEAD -> lecture-03-posts)` | Where HEAD is pointing — your current branch and commit |
| `(origin/lecture-03-posts)` | Where the remote branch is — last time you pushed/fetched |
| The message | Your commit message |

---

### git diff

Shows what has changed but not yet staged.

```bash
$ git diff
diff --git a/tests/lecture-02/lecture.test.ts b/tests/lecture-02/lecture.test.ts
index 3b4f5a0..7c9d2e1 100644
--- a/tests/lecture-02/lecture.test.ts
+++ b/tests/lecture-02/lecture.test.ts
@@ -15,6 +15,10 @@ describe('Auth', () => {
   it('should return 401 for invalid credentials', async () => {
     const response = await axios.post(`${BASE_URL}/auth/signin`, { ... });
     expect(response.status).toBe(401);
+
+    // Added: also verify the error message
+    expect(response.data.message).toContain('Invalid credentials');
   });
```

Lines starting with `+` are additions. Lines starting with `-` are deletions.

To diff staged changes (what will go into the next commit):

```bash
$ git diff --staged
```

---

### git stash

Temporarily shelves (stashes) changes you have made but are not ready to commit. Useful when you need to switch branches but are mid-way through work.

```bash
# Stash all uncommitted changes
$ git stash

# Your working directory is now clean
$ git status
nothing to commit, working tree clean

# Switch branches, do other work...
$ git checkout main

# Come back and restore your stashed work
$ git checkout lecture-03-posts
$ git stash pop
```

You can have multiple stashes. `git stash list` shows them all. `git stash pop` applies the most recent stash and removes it from the stash list.

---

### git remote -v

Shows the remote URLs your local repository is connected to.

```bash
$ git remote -v
origin  https://github.com/your-org/chatty-api-tests.git (fetch)
origin  https://github.com/your-org/chatty-api-tests.git (push)
```

`origin` is the default name for the remote. Most projects have one remote named `origin`.

---

## The Lecture Branch Naming Convention

In this course, branches follow a consistent naming pattern so it is clear what work each branch contains.

### Format

```
lecture-NN-short-description
```

Where `NN` is a zero-padded lecture number.

### Examples

```
lecture-01-setup
lecture-01-setup-homework
lecture-02-auth-tests
lecture-02-auth-tests-homework
lecture-03-posts
lecture-03-posts-homework
lecture-04-comments
lecture-04-comments-homework
```

### Why this pattern matters

- You can see all lecture branches grouped together in `git branch` output
- It is immediately clear what each branch contains
- Homework branches are separate from the main lecture branch, so you can PR them independently

---

## The Pull Request Workflow

The standard workflow for this course (and for professional teams) is:

### Step 1: Start from an up-to-date main branch

```bash
$ git checkout main
$ git pull origin main
```

### Step 2: Create a feature branch

```bash
$ git checkout -b lecture-03-posts
```

### Step 3: Do your work

Write code, run tests, make sure everything passes.

```bash
$ npm test tests/lecture-03/lecture.test.ts
```

### Step 4: Stage and commit

```bash
$ git add tests/lecture-03/
$ git status        # review what you are about to commit
$ git commit -m "add lecture-03 GET and POST posts tests"
```

### Step 5: Push the branch to GitHub

```bash
$ git push -u origin lecture-03-posts
```

### Step 6: Open a Pull Request on GitHub

Go to github.com, navigate to your repository. GitHub will show a banner: "lecture-03-posts recently pushed — Compare & pull request". Click it.

Write a description, assign a reviewer if applicable, and click **Create pull request**.

### Step 7: After merge, pull main and start the next branch

```bash
$ git checkout main
$ git pull origin main       # get the merge commit from GitHub
$ git checkout -b lecture-04-comments
```

---

## Common Mistakes

### Committing .env

Your `.env` file contains API secrets and the `x-test-secret` header value. Never commit it to git.

The `.gitignore` file in this course already includes:

```
.env
.env.local
.env.*.local
```

If you accidentally commit it:

```bash
# Remove from tracking but keep the file on disk
$ git rm --cached .env
$ git commit -m "remove .env from tracking"
$ git push
```

If the commit with the secret has been pushed to a public repo, the secret must be considered compromised and rotated.

### Forgetting to push

You committed locally but did not push. Your teammate opens the PR and does not see your latest work.

Check whether your branch is ahead of the remote:

```bash
$ git status
On branch lecture-03-posts
Your branch is ahead of 'origin/lecture-03-posts' by 2 commits.
  (use "git push" to publish your local commits)
```

Run `git push`.

### Working on the wrong branch

You make changes, realize you are on `main` instead of your feature branch.

Option 1 — if you have not committed yet, stash and move:

```bash
$ git stash
$ git checkout -b lecture-03-posts
$ git stash pop
```

Option 2 — if you have already committed to main (and not pushed), use git reset to move the commit to a branch:

```bash
$ git branch lecture-03-posts     # create branch at current position
$ git reset --hard HEAD~1         # move main back one commit
$ git checkout lecture-03-posts   # switch to the branch with your work
```

Only do this if the commit has NOT been pushed to origin.

### Merge conflicts

A merge conflict happens when two branches modify the same lines of the same file, and git cannot automatically choose which version to keep.

```
<<<<<<< HEAD
  expect(response.status).toBe(200);
=======
  expect(response.status).toBe(201);
>>>>>>> lecture-03-posts
```

Resolve by editing the file to keep the correct version (remove the `<<<<<<<`, `=======`, `>>>>>>>` markers). Then:

```bash
$ git add tests/lecture-03/lecture.test.ts
$ git commit -m "resolve merge conflict in lecture-03 test"
```

### Pushing to main directly

In professional projects, direct pushes to `main` are blocked. In this course, you should also avoid it. Always work on a feature branch and open a PR.

If you accidentally push to main:

```bash
$ git checkout main
$ git revert HEAD    # creates a new commit that undoes the last one
$ git push
```

### Using git add . without checking git status first

`git add .` stages everything, including `.env`, build artifacts, or temporary files you do not want committed. Always run `git status` first to see what is pending.

---

## Quick Reference Card

```bash
# Start new lecture work
git checkout main
git pull origin main
git checkout -b lecture-05-reactions

# Check what you've changed
git status
git diff

# Stage and commit
git add tests/lecture-05/
git commit -m "add lecture-05 reaction tests"

# Push and create PR
git push -u origin lecture-05-reactions

# See history
git log --oneline

# Save work-in-progress and switch context
git stash
git checkout main
# ... do other work ...
git checkout lecture-05-reactions
git stash pop

# After PR is merged on GitHub
git checkout main
git pull origin main
git branch -d lecture-05-reactions
```

---

## Related Topics

- [CLI Basics](cli-basics.md) — terminal commands used to run git
- [npm Commands](npm-commands.md) — manage package.json and dependencies alongside git
- [Postman](postman.md) — export collection files to commit to git
- [Newman](newman.md) — commit Newman CI workflow files to git

## Official Documentation

- [Git — Official docs](https://git-scm.com/doc)
- [Git — Reference manual](https://git-scm.com/docs)
- [GitHub — Git cheat sheet](https://training.github.com/downloads/github-git-cheat-sheet/)
- [Pro Git book (free)](https://git-scm.com/book/en/v2)
