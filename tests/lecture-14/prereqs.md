# Before Lecture 14 — Password Reset & SSO

**Total prep time: ~15 min**

---

## Essential

- [ ] **Password reset email flow**
  Read: [OWASP — Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
  *~10 min · Token-based reset, 1-hour expiry (as in Chatty), one-time use*
  This explains why step 2 (clicking the email link) cannot be automated.

- [ ] **What is SSO?**
  Read: [Auth0 — What is Single Sign-On?](https://auth0.com/blog/what-is-and-how-does-single-sign-on-work/)
  *~5 min · Using an existing verified identity to create a new session*

---

## Videos

- [ ] **Password reset flow explained**
  Watch: https://www.youtube.com/watch?v=Rh6aJtHuEdc
  *~10 min · Full flow: request → token generation → email → reset → invalidate*

- [ ] **SSO explained** — Okta
  Watch: https://www.youtube.com/watch?v=AtfznYgOw34
  *~5 min · How SSO differs from regular login*

---

## Interactive tools

- [ ] **OWASP security testing guide** — for authentication testing
  Browse: [owasp.org/www-project-testing-guide/](https://owasp.org/www-project-testing-guide/)
  *~5 min · Chapter on authentication testing — practical security checks*

- [ ] **Mailtrap** — test email service (useful if you want to automate step 2 later)
  Try: [mailtrap.io](https://mailtrap.io)
  *~5 min · A test inbox that captures emails via API — enables full reset flow automation*

---

## Also useful

- [Node.js crypto module](https://nodejs.org/api/crypto.html) — how Chatty generates the reset token (`crypto.randomBytes(20).toString('hex')`)
- [Auth0 — Password reset security](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers) — best practices

---

> **We test:** Step 1 (200 response) and Step 3 with an invalid token (400).
> We do NOT test: Step 2 (email link) — requires a test email inbox service like Mailtrap.
