# Lecture 05 — Postman Homework SOLUTION

---

## Solution 1 — Create Post

**Tests tab:**
```js
pm.test('Status is 201', () => pm.response.to.have.status(201));

pm.test('Message is correct', () => {
  pm.expect(pm.response.json().message).to.eql('Post created successfully');
});

pm.test('Response has no _id field', () => {
  pm.expect(pm.response.json()).to.not.have.property('_id');
});
```

**Why no `_id` in the response?**
The Chatty API follows a pattern where creation endpoints return only a confirmation
message. The ID is generated server-side and stored in Redis. You retrieve it by
querying the list. This is a valid REST design — some APIs return the created resource
(including ID), others return just the message. As a tester, you adapt.

---

## Solution 2 — Get All Posts

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Posts is an array', () => {
  pm.expect(pm.response.json().posts).to.be.an('array');
});

pm.test('totalPosts is greater than 0', () => {
  pm.expect(pm.response.json().totalPosts).to.be.above(0);
});

// Find our post and save ID (not a test — a script action)
const posts = pm.response.json().posts;
const myPost = posts.find(p => p.post === 'My homework post!');
if (myPost) {
  pm.environment.set('postId', myPost._id);
}
```

**Why is our post immediately visible in the GET?**
The server writes to Redis synchronously before returning 201. `GET /post/all/1`
reads from Redis. So there is no delay — the post is there immediately.

---

## Solution 3 — Update Post

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Message is "Post updated successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Post updated successfully');
});
```

---

## Solution 4 — Verify Update

**Tests tab:**
```js
const posts = pm.response.json().posts;
const updated = posts.find(p => p._id === pm.environment.get('postId'));

pm.test('Post content was updated', () => {
  pm.expect(updated.post).to.eql('Updated homework post!');
});
```

**Why find by `_id` here instead of by content?**
We just changed the content — `"My homework post!"` no longer exists in the list.
Finding by `_id` is the correct way to locate a specific post regardless of its content.
`_id` is the stable identifier; `post` (the content) is mutable.

---

## Solution 5 — Delete Post

**Tests tab:**
```js
pm.test('Status is 200', () => pm.response.to.have.status(200));

pm.test('Message is "Post deleted successfully"', () => {
  pm.expect(pm.response.json().message).to.eql('Post deleted successfully');
});
```

---

## Stretch answer

After running the full sequence and deleting the post, calling **L05 — Get All Posts**
again will NOT show the deleted post. It is removed from Redis immediately when
`DELETE /post/:postId` is called:

```ts
await postCache.deletePostFromCache(req.params.postId, req.currentUser.userId);
```

Since `GET /post/all/1` reads from Redis, the deleted post is gone right away.
The DB deletion is queued (async) but the Redis removal is synchronous — which is
what GET reads from.
