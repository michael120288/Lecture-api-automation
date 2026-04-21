# Before Lecture 11 — CI/CD — GitHub Actions Pipeline

**Total prep time: ~20 min**

---

## Essential

- [ ] **What is CI/CD?**
  Read: [GitHub — Understanding GitHub Actions](https://docs.github.com/en/actions/about-github-actions/understanding-github-actions)
  *~10 min · Workflow, job, step, runner — the four concepts*

- [ ] **YAML syntax**
  Read: [YAML official learn page](https://yaml.org/learn.html)
  *~5 min · Indentation-based (spaces, never tabs). `key: value`. `- list item`.*

---

## Videos

- [ ] **GitHub Actions in 10 minutes** — Fireship
  Watch: Search YouTube → *"GitHub Actions in 10 minutes Fireship"*
  *~10 min · See a real workflow file, triggers, jobs, steps*

- [ ] **CI/CD explained** — freeCodeCamp
  Watch: Search YouTube → *"CI CD pipeline explained freeCodeCamp"*
  *~15 min · What happens at each stage from commit to deploy*

---

## Interactive tools

- [ ] **GitHub Actions marketplace** — browse pre-built actions
  Try: [github.com/marketplace?type=actions](https://github.com/marketplace?type=actions)
  *~5 min · Search `checkout`, `setup-node` — these are the actions used in this lecture*

- [ ] **YAML validator** — check your workflow file syntax
  Try: [yamlchecker.com](https://yamlchecker.com)
  *~3 min · Paste your YAML and see if indentation is correct*

- [ ] **YAML to JSON converter** — see your workflow as JSON
  Try: Search → *"YAML to JSON converter online"*
  *~3 min · Helpful for understanding the nested structure*

---

## Also useful

- [GitHub Actions — events that trigger workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows) — `push`, `pull_request`, `workflow_dispatch`
- [GitHub — encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) — how to store API keys safely
- [GitHub Actions starter workflows](https://github.com/actions/starter-workflows) — ready-made templates

---

> **Required:** A GitHub account and a repository for `chatty-api-tests`.
> The workflow file goes in `.github/workflows/tests.yml`.
