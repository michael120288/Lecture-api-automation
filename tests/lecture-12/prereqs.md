# Before Lecture 12 — Docker — Containerising the Test Runner

**Total prep time: ~20 min**

---

## Essential

- [ ] **What is Docker?**
  Read: [Docker — Get started overview](https://docs.docker.com/get-started/overview/)
  *~10 min · Image, container, Dockerfile — the three core concepts*

- [ ] **Containers vs VMs**
  Read: [Docker — Containers vs virtual machines](https://www.docker.com/blog/containers-and-vms-a-practical-comparison/)
  *~5 min · Why containers start in milliseconds and use ~40MB (alpine) vs 900MB*

- [ ] **Install Docker Desktop**
  Download: [docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)
  *~5 min · Required. Verify with: `docker --version`*

---

## Videos

- [ ] **Docker in 100 seconds** — Fireship
  Watch: https://www.youtube.com/watch?v=Gjnup-PuquQ
  *~2 min · Best quick visual intro to containers*

- [ ] **Docker crash course** — Traversy Media
  Watch: https://www.youtube.com/watch?v=Kyx2PsuwomE
  *~1 hour · Full walkthrough: build image, run container, volumes, compose*

---

## Interactive tools

- [ ] **Play with Docker** — run Docker in the browser (no install needed)
  Try: [labs.play-with-docker.com](https://labs.play-with-docker.com)
  *~10 min · Run `docker pull node:20-alpine` and `docker run node:20-alpine node --version`*

- [ ] **Dockerfile reference** — all instructions explained
  Try: [docs.docker.com/reference/dockerfile/](https://docs.docker.com/reference/dockerfile/)
  *~5 min skim · FROM, WORKDIR, COPY, RUN, CMD — you will use all of these*

---

## Also useful

- [DockerHub — node:20-alpine](https://hub.docker.com/_/node) — the base image used in this lecture
- [Docker compose file reference](https://docs.docker.com/compose/compose-file/) — for the `docker-compose.yml`
- [.dockerignore documentation](https://docs.docker.com/reference/dockerfile/#dockerignore-file) — what to exclude

---

> **We are NOT containerising the Chatty backend** — it is already deployed.
> We are containerising the **test runner** (this project) so tests run identically everywhere.
