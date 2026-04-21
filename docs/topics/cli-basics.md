# CLI Basics

## What a Terminal / CLI Is

The **terminal** (also called a **command-line interface** or **CLI**) is a text-based way to interact with your computer. Instead of clicking icons, you type commands and press Enter. The computer responds with text output.

Every developer tool in this course — Node.js, npm, Vitest, Newman, git — is designed to be operated from the terminal. Learning the basics early means fewer surprises later.

### Terminal vs Shell vs Command Line

These three terms are often used interchangeably, but they refer to slightly different things:

| Term | What it is |
|---|---|
| **Terminal** | The window you type in (Terminal.app on macOS, Windows Terminal on Windows) |
| **Shell** | The program running inside the terminal that interprets your commands (bash, zsh, fish) |
| **Command line** | The line of text where you type commands (also called the prompt) |

Think of it this way: the terminal is the room, the shell is the interpreter living in that room.

---

## Shell Types: bash and zsh

The two shells you will encounter most often are:

### zsh (Z shell)

macOS has used **zsh** as the default shell since macOS Catalina (10.15, released 2019). When you open Terminal.app on a modern Mac, you are running zsh.

### bash (Bourne Again Shell)

**bash** was the macOS default before Catalina, and it is still the default on most Linux servers and inside many Docker containers. GitHub Actions runners use bash.

**The difference matters less than it seems.** Every command in this course works identically in both zsh and bash. The only noticeable differences are the default prompt appearance and some advanced scripting features you will not need.

### How to check which shell you are running

```bash
echo $SHELL
# /bin/zsh  (on modern Mac)
# /bin/bash  (on Linux or older Mac)
```

---

## The Prompt

The **prompt** is the symbol (or text) that appears when the shell is ready to accept a command. You will often see it written as `$` in documentation and tutorials:

```
$
```

On your actual terminal, the prompt includes more context:

```
username@hostname chatty-api-tests %
```

The `%` at the end is the zsh default prompt character. bash uses `$`. In tutorials, `$` is used generically for both.

**You never type the `$` character itself.** It is just notation to indicate "this is something you type in the terminal."

When you see:

```bash
$ npm install
```

You only type `npm install`. The `$` means "at the terminal prompt."

---

## The Concept of Current Directory

The terminal always has a **current working directory** — the folder it is "in" right now. Every command you run operates relative to that directory unless you specify an absolute path.

Think of it like the Finder on macOS. You navigate into a folder to see its contents. The terminal works the same way, but with typed commands instead of clicks.

---

## Absolute vs Relative Paths

### Absolute path

An absolute path starts from the root of the filesystem (`/` on macOS/Linux). It is unambiguous — it means the same thing no matter where you are.

```
/Users/michael120288/WebstormProjects/fullStack/theProject/chatty-api-tests
```

### Relative path

A relative path is relative to your current directory. If you are already inside `chatty-api-tests/`, you can refer to the tests folder simply as:

```
tests/lecture-02
```

instead of the full absolute path.

### Special path symbols

| Symbol | Meaning |
|---|---|
| `.` | Current directory |
| `..` | Parent directory (one level up) |
| `~` | Your home directory (`/Users/michael120288` on Mac) |

---

## Every Command Used in the Course

### pwd — Print Working Directory

Shows you the absolute path of your current directory. Use this whenever you feel lost.

```bash
$ pwd
/Users/michael120288/WebstormProjects/fullStack/theProject/chatty-api-tests
```

---

### ls — List Files

Lists the files and folders in the current directory.

```bash
$ ls
docs  node_modules  package.json  package-lock.json  tests  tsconfig.json
```

#### ls -la — List all files with details

The `-l` flag shows one file per line with permissions, owner, size, and modification date. The `-a` flag shows hidden files (files starting with `.`).

```bash
$ ls -la
total 96
drwxr-xr-x  12 michael120288  staff   384 Apr 18 10:22 .
drwxr-xr-x   8 michael120288  staff   256 Apr 15 09:10 ..
-rw-r--r--   1 michael120288  staff   412 Apr 14 08:30 .env
-rw-r--r--   1 michael120288  staff  1204 Apr 14 08:30 .gitignore
drwxr-xr-x   5 michael120288  staff   160 Apr 18 10:22 docs
drwxr-xr-x  45 michael120288  staff  1440 Apr 14 09:15 node_modules
-rw-r--r--   1 michael120288  staff   892 Apr 14 08:30 package.json
-rw-r--r--   1 michael120288  staff  8654 Apr 14 08:30 package-lock.json
drwxr-xr-x   6 michael120288  staff   192 Apr 18 09:45 tests
-rw-r--r--   1 michael120288  staff   310 Apr 14 08:30 tsconfig.json
```

Hidden files (`.env`, `.gitignore`) only appear with `-a`.

---

### cd — Change Directory

Changes your current directory.

```bash
# Navigate into a subdirectory
$ cd tests

# Navigate using an absolute path
$ cd /Users/michael120288/WebstormProjects/fullStack/theProject/chatty-api-tests

# Go up one level (to the parent directory)
$ cd ..

# Go up two levels
$ cd ../..

# Go to your home directory
$ cd ~

# Go to the previous directory you were in
$ cd -
```

#### Navigating the chatty-api-tests project

Starting from your home directory:

```bash
$ cd ~/WebstormProjects/fullStack/theProject/chatty-api-tests
$ pwd
/Users/michael120288/WebstormProjects/fullStack/theProject/chatty-api-tests

$ cd tests
$ ls
lecture-01  lecture-02  lecture-03

$ cd lecture-02
$ ls
README.md  lecture.test.ts  homework

$ cd ..   # back to tests/
$ cd ..   # back to chatty-api-tests/
```

---

### mkdir — Make Directory

Creates a new directory.

```bash
# Create a single directory
$ mkdir reports

# Create nested directories (all at once)
$ mkdir -p tests/lecture-05/homework
```

The `-p` flag creates all intermediate directories that do not exist yet. Without `-p`, if `tests/lecture-05` does not exist, the command fails.

```bash
# Without -p — fails if lecture-05 does not exist
$ mkdir tests/lecture-05/homework
mkdir: tests/lecture-05: No such file or directory

# With -p — succeeds regardless
$ mkdir -p tests/lecture-05/homework
```

---

### touch — Create an Empty File

Creates an empty file if it does not exist. If the file already exists, it updates the modification timestamp.

```bash
# Create a new empty file
$ touch tests/lecture-05/lecture.test.ts

# Create multiple files at once
$ touch tests/lecture-05/lecture.test.ts tests/lecture-05/README.md
```

---

### cat — Print File Contents

Prints the entire contents of a file to the terminal.

```bash
$ cat package.json
{
  "name": "chatty-api-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "vitest run",
    ...
  }
}
```

For long files, the output scrolls past quickly. Use `less filename` instead to scroll through it page by page (press `q` to quit).

---

### cp — Copy Files

Copies a file from source to destination.

```bash
# Copy a file
$ cp tests/lecture-02/homework/solution.test.ts tests/lecture-03/homework/starter.test.ts

# Copy a directory and all its contents (recursive)
$ cp -r tests/lecture-02 tests/lecture-02-backup
```

The `-r` flag is required when copying directories.

---

### mv — Move or Rename

Moves a file to a new location, or renames it.

```bash
# Rename a file
$ mv lecture.test.old.ts lecture.test.ts

# Move a file to a different directory
$ mv lecture.test.ts tests/lecture-04/

# Move and rename at the same time
$ mv old-name.ts tests/lecture-04/new-name.ts
```

---

### rm — Delete Files

Permanently deletes files. There is no Trash/Recycle Bin — deletion is immediate.

```bash
# Delete a single file
$ rm tests/lecture-01/temp.ts
```

#### rm -rf — Delete a Directory and All Its Contents

```bash
$ rm -rf tests/lecture-01-old
```

**Warning about `rm -rf`:** This command deletes everything inside the target directory recursively and forcefully, with no confirmation and no undo. Do not run `rm -rf /` or `rm -rf ~` or any path that points to something important. Double-check the path before pressing Enter.

---

### echo — Print Text

Prints text to the terminal. Useful for printing variable values.

```bash
# Print a string
$ echo "Hello, world"
Hello, world

# Print an environment variable value
$ echo $NODE_ENV
development

# Print the PATH variable (where your shell looks for commands)
$ echo $PATH
/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

---

### export — Set an Environment Variable for the Session

Sets an environment variable that is available to any process started in the current shell session.

```bash
$ export NODE_ENV=test
$ export BASE_URL=https://api.codeandtest.com/api/v1

# Verify it was set
$ echo $NODE_ENV
test
```

**Important:** `export` only affects the current terminal session. When you close the terminal and open a new one, the variable is gone. To make a variable permanent, add it to `~/.zshrc` (for zsh) or `~/.bashrc` (for bash).

For this course, environment variables like API secrets are stored in a `.env` file and loaded automatically by the test framework. You rarely need to `export` manually.

---

### which — Find Where a Command Lives

Tells you the full file path of a command. Useful when you need to verify a program is installed and which version is being used.

```bash
$ which node
/usr/local/bin/node

$ which npm
/usr/local/bin/npm

$ which npx
/usr/local/bin/npx

$ which newman
/usr/local/bin/newman
```

If `which` returns nothing, the command is not installed or not on your PATH.

---

## Command History and Productivity Shortcuts

### Up and down arrows

Press the **up arrow** to scroll backward through your command history. Press the **down arrow** to go forward again. You can edit the recalled command before pressing Enter.

```
Press up arrow: npm run test tests/lecture-02/lecture.test.ts
Press up arrow: npm install axios
Press up arrow: cd tests
```

### Ctrl+R — Reverse search

Press **Ctrl+R** to search your command history interactively. Start typing and the shell finds the most recent command matching what you typed.

```
(reverse-i-search)`newman': newman run ./postman/chatty-collection.json -e ./postman/chatty-env.json
```

Press Enter to run it, or press **Ctrl+R** again to find the next match.

### Tab completion

Press **Tab** to auto-complete file names, directory names, and command names. Press Tab twice to see all possible completions if there is ambiguity.

```bash
$ cd tests/lec<Tab>
# Completes to:
$ cd tests/lecture-

$ cd tests/lecture-02<Tab>
# Shows nothing more to complete (exact match)
```

Tab completion works for:
- Directory and file names in paths
- Command names (try typing `new<Tab>` to see `newman`)
- npm script names (in some shells with plugins)

---

## Terminal Control Shortcuts

| Shortcut | What it does |
|---|---|
| **Ctrl+C** | Cancel the current running command. Use when a process is stuck or you want to stop it. |
| **Ctrl+L** | Clear the terminal screen. Same as typing `clear` and pressing Enter. |
| **Ctrl+A** | Jump to the beginning of the current command line. |
| **Ctrl+E** | Jump to the end of the current command line. |
| **Ctrl+U** | Delete everything to the left of the cursor on the current line. |
| **Ctrl+W** | Delete the word immediately to the left of the cursor. |
| **Ctrl+Z** | Suspend (pause) the current process. Type `fg` to resume it. |
| **Ctrl+D** | Send EOF (end-of-file). Closes the terminal session if typed at an empty prompt. |

---

## Real Examples: Navigating the chatty-api-tests Project

### Starting a new lecture

```bash
# Go to the project root
$ cd ~/WebstormProjects/fullStack/theProject/chatty-api-tests

# Create the lecture directory with homework subdirectory
$ mkdir -p tests/lecture-06/homework

# Create the test files
$ touch tests/lecture-06/lecture.test.ts
$ touch tests/lecture-06/README.md
$ touch tests/lecture-06/homework/starter.test.ts
$ touch tests/lecture-06/homework/solution.test.ts

# Verify the structure
$ ls -la tests/lecture-06/
total 8
drwxr-xr-x  6 michael120288  staff  192 Apr 18 11:00 .
drwxr-xr-x  8 michael120288  staff  256 Apr 18 11:00 ..
drwxr-xr-x  4 michael120288  staff  128 Apr 18 11:00 homework
-rw-r--r--  1 michael120288  staff    0 Apr 18 11:00 lecture.test.ts
-rw-r--r--  1 michael120288  staff    0 Apr 18 11:00 README.md
```

### Running tests from the project root

```bash
# Make sure you are in the right place
$ pwd
/Users/michael120288/WebstormProjects/fullStack/theProject/chatty-api-tests

# Run all tests
$ npm test

# Run a specific lecture file
$ npm test tests/lecture-02/lecture.test.ts
```

### Checking if a package is installed

```bash
$ which vitest
# If nothing prints, vitest is not globally installed
# (that is fine — it is run via npx or npm test)

$ which npx
/usr/local/bin/npx  # npx is part of Node.js
```

### Checking your Node.js version

```bash
$ node --version
v20.11.0

$ npm --version
10.2.4
```

---

## Common Mistakes for Terminal Beginners

| Mistake | What happens | Fix |
|---|---|---|
| Typing the `$` from documentation | Shell tries to run `$` as a command | Only type the command after the `$` |
| Running a command from the wrong directory | "Cannot find module" errors, files created in wrong place | Use `pwd` to check where you are, then `cd` to the right place |
| Using `rm -rf` on the wrong path | Permanent data loss | Always double-check the path before running `rm -rf` |
| Running `cd` into a file (not a directory) | `cd: not a directory: package.json` | Use `ls` first to confirm what you are navigating to |
| Pressing Enter mid-command thinking the terminal is frozen | Command runs incomplete or with wrong arguments | Check for an open quote `'` or `"` in your prompt — it means the shell expects more input. Press **Ctrl+C** to cancel. |
| Forgetting that `export` variables are session-only | Variable missing in new terminal | Add it to `.env` and load via dotenv, or add to `~/.zshrc` |
| `command not found: newman` | Newman is not installed globally | Run `npm install -g newman` |

---

## Related Topics

- [npm Commands](npm-commands.md) — install packages and run scripts from the terminal
- [Git Commands](git-commands.md) — use git from the terminal
- [Newman](newman.md) — run your Postman collection from the terminal

## Official Documentation

- [MDN — Command line crash course](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Understanding_client-side_tools/Command_line)
- [Ubuntu — Using the terminal](https://ubuntu.com/tutorials/command-line-for-beginners)
- [zsh — Official docs](https://zsh.sourceforge.io/Doc/)
