# Before Lecture 17 — Chat & Messaging

**Total prep time: ~15 min**

---

## Essential

- [ ] **WebSocket vs HTTP**
  Read: [MDN — WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
  *~7 min · Chatty uses Socket.IO (WebSocket) to deliver messages in real-time*
  The REST endpoints we test send/store messages. Socket.IO delivers them live.

- [ ] **Conversation threading**
  Read: [Wikipedia — Conversation threading](https://en.wikipedia.org/wiki/Conversation_threading)
  *~3 min · Why messages between two users are grouped by `conversationId`*

- [ ] **Real-time options compared**
  Read: [Ably — WebSockets vs long polling](https://ably.com/topic/websockets-vs-long-polling)
  *~5 min · Why chat apps use WebSockets instead of repeated HTTP requests*

---

## Videos

- [ ] **WebSocket explained** — Fireship
  Watch: Search YouTube → *"WebSocket in 100 seconds Fireship"*
  *~2 min · How a persistent bidirectional connection works*

- [ ] **Socket.IO tutorial** — what Chatty uses internally
  Watch: Search YouTube → *"Socket.IO tutorial beginner"*
  *~20 min · Event-based messaging: `socket.emit('message', data)` on both sides*

---

## Interactive tools

- [ ] **WebSocket tester** — test WebSocket connections in the browser
  Try: [websocket.org/echo.html](http://websocket.org/echo.html) or Search → *"WebSocket online tester"*
  *~5 min · Connect to the echo server, send a message, see it returned instantly*

- [ ] **Socket.IO playground**
  Try: [socket.io](https://socket.io/demos/chat/) — official demo chat
  *~5 min · See real-time messaging in action — same technology as Chatty*

---

## Also useful

- [Socket.IO documentation](https://socket.io/docs/v4/) — what Chatty uses for real-time delivery
- [MDN — Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) — an alternative to WebSockets (one-way)
- [Ably — Real-time messaging patterns](https://ably.com/resources) — industry patterns for chat apps

---

> **Two users required** (same as Lecture 09):
> User B is created in `beforeAll` with Faker.js and deleted in `afterAll`.
> The REST API stores/retrieves messages. Socket.IO delivers them in real-time.
> We test the REST side only — socket delivery is not directly testable with Axios.
