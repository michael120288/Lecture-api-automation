# Lecture 17 — Postman Homework

## Task 1 — Send first message → 200, save conversationId
## Task 2 — GET conversation-list → list array, conversationId present
## Task 3 — GET messages with user B → messages array, save first messageId
## Task 4 — Mark as read → 200
## Task 5 — React to message: PUT /chat/message/reaction with conversationId, messageId, "😊", "add" → 200
## Task 6 — Delete message: DELETE /chat/message/mark-as-deleted/{{messageId}}/{{userAId}}/{{userBId}}/deleteForMe → 200, message "Message marked as deleted"
## Task 7 — Delete conversation: DELETE /chat/conversation/{{userBId}} → 200, message "Conversation removed". Verify GET conversation-list no longer shows it.
