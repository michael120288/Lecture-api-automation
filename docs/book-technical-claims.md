# Book Technical Audit — API Testing Course

Extracted from `api-testing-book copy.md` (~31,943 lines). Cross-referenced against lecture source files.

---

## 12 Internal Contradictions Found

| # | Contradiction | Correct (per lectures) | Wrong location |
|---|--------------|------------------------|---------------|
| 1 | Auth endpoint `/signup` vs `/auth/signup` | `/signup` | Ref 10, 13, 14, 15 |
| 2 | Post path `/post` vs `/posts` | `/post` | Ref 10, 13, 14 |
| 3 | GET /currentuser response key: `user` vs `currentUser` | `user` | Some Appendix C entries |
| 4 | POST /post returns post `_id` or not | Does NOT return ID (Ch 8 / L05) | Ch 13 uses `postResponse.data.post._id` |
| 5 | DELETE /post/:id returns 200 or 204 | **200** (L05 confirms) | Appendix B lists it under 204 |
| 6 | Invalid credentials status: 400 or 401 | **400** | Some early ch examples + Ref 10 |
| 7 | Signup response includes `token` or not | No token (cookie-only) | Ref 7 asserts `typeof res.data.token === 'string'` |
| 8 | Vitest config: `fileParallelism: false` vs `singleFork: true` | `fileParallelism: false` | Appendix D |
| 9 | Signup password minimum: 8 or 12 chars | **12** (L03 confirms) | Course examples use `'Test1234!'` (9 chars) |
| 10 | `x-test-secret` value source | `TEST_CLEANUP_SECRET` from fixtures | Ch 6/13, Ref 12 use `process.env.TEST_SECRET` |
| 11 | Pagination: 0-based or 1-based | **1-based** (`/post/all/1`) (L05 confirms) | Ref 10/13/14 use `/posts/all/0` |
| 12 | Auth method: Cookie vs Bearer token | **Cookie** session | Ref 10, 13, 15 use `Authorization: Bearer` |

---

## Dead Code Found

| Location | Variable | Declared | Assigned | Ever Read |
|----------|----------|----------|----------|-----------|
| Ch 6 | `authToken: string` | Yes | `authToken = signinResponse.data.token` | Never — all tests use `authCookie` |
| Ch 15 | `uploadedImageUrl: string` | Yes | `uploadedImageUrl = response.data.url` | Never — subsequent tests make new requests |

---

## Missing `validateStatus: () => true`

- `src/client.ts` (Ch 6) — shared `axios.create()` instance, contradicts Ch 4's core teaching
- Ch 13 `beforeAll` post creation call
- Some Reference 10 `.then()` chain examples

---

## Response Shape Claims (Canonical per lectures)

**POST /signup 201:**
```json
{ "message": "User created successfully", "user": { "_id": "...", "authId": "...", "username": "...", "email": "...", "avatarColor": "...", "profilePicture": "..." } }
```
Plus `set-cookie`. No `token` in signup response.

**POST /signin 200:**
```json
{ "message": "User login successfully", "token": "eyJ...", "user": { ... } }
```
Plus `set-cookie`.

**GET /currentuser 200:**
```json
{ "token": "eyJ...", "isUser": true, "user": { "_id": "...", "authId": "...", "username": "...", ... } }
```

---

## Field Boundaries (Authoritative per L03)

| Field | Endpoint | Min | Max |
|-------|----------|-----|-----|
| username | /signup | 4 | 20 |
| username | /signin | 4 | 32 |
| password | /signup | **12** + special char | 128 |
| password | /signin | 8 | 128 |

**NOTE:** Book examples use `'Test1234!'` (9 chars) throughout — violates 12-char signup minimum.
