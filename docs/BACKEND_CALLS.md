# Backend: Audio & Video Calls (WebRTC Signaling)

The frontend uses **WebRTC** for media and **Socket.io** only to exchange signaling (SDP + ICE). Your backend must **relay** messages between two users — it does not handle audio/video bytes.

Event names are defined in `src/common/enums.ts` (`SOCKET_EVENTS`).

---

## 1. Track connected users

On socket connect (after JWT auth), store:

```js
// userId (from token) -> socket.id
const userSockets = new Map(); // Map<string, string>

socket.on("connection", (socket) => {
  const userId = socket.user.id; // however you decode auth today
  userSockets.set(userId, socket.id);

  socket.on("disconnect", () => {
    userSockets.delete(userId);
    // also remove from online-users list you already broadcast
  });
});
```

Helper:

```js
function emitToUser(io, userId, event, payload) {
  const socketId = userSockets.get(userId);
  if (!socketId) return false;
  io.to(socketId).emit(event, payload);
  return true;
}
```

---

## 2. Events to implement

### Client → Server (listen with `socket.on`)

| Event | Payload | Action |
|-------|---------|--------|
| `call-user` | `{ toUserId, chatId, callType, callId }` | Start call; notify callee |
| `call-accepted` | `{ toUserId, callId }` | Tell caller callee accepted |
| `call-rejected` | `{ toUserId, callId }` | Tell other party call declined |
| `call-ended` | `{ toUserId, callId }` | Tell other party call ended |
| `webrtc-offer` | `{ toUserId, callId, sdp }` | Forward SDP offer (`sdp` required; `offer` alias ok) |
| `webrtc-answer` | `{ toUserId, callId, sdp }` | Forward SDP answer (`sdp` required; `answer` alias ok) |
| `ice-candidate` | `{ toUserId, callId, candidate }` | Forward ICE candidate |

### Server → Client (emit with `emitToUser`)

| Event | Payload |
|-------|---------|
| `incoming-call` | `{ callId, fromUserId, fromUserName?, chatId, callType }` |
| `call-accepted` | `{ callId, fromUserId }` |
| `call-rejected` | `{ callId, fromUserId, reason?: "rejected" }` |
| `call-ended` | `{ callId, fromUserId, reason?: "ended" }` |
| `call-busy` | `{ callId, fromUserId, reason?: "busy" }` |
| `call-offline` | `{ callId, reason?: "offline" }` |
| `webrtc-offer` | `{ callId, fromUserId, sdp }` |
| `webrtc-answer` | `{ callId, fromUserId, sdp }` |
| `ice-candidate` | `{ callId, fromUserId, candidate }` |

Always include **`fromUserId`** on relayed events so the client can verify `callId`.

---

## 3. Example handlers (Node.js + Socket.io)

```js
const { Server } = require("socket.io");

// Assumes: socket.userId set during auth middleware
const userSockets = new Map();

function relay(io, fromUserId, toUserId, event, data) {
  const socketId = userSockets.get(toUserId);
  if (!socketId) return false;
  io.to(socketId).emit(event, { ...data, fromUserId });
  return true;
}

io.on("connection", (socket) => {
  const userId = socket.userId;
  userSockets.set(userId, socket.id);

  socket.on("call-user", async ({ toUserId, chatId, callType, callId }) => {
    if (!toUserId || !callId || !chatId) return;

    const delivered = relay(io, userId, toUserId, "incoming-call", {
      callId,
      chatId,
      callType,
      fromUserName: socket.userName, // optional, from DB
    });

    if (!delivered) {
      socket.emit("call-offline", { callId, reason: "offline" });
    }
  });

  socket.on("call-accepted", ({ toUserId, callId }) => {
    relay(io, userId, toUserId, "call-accepted", { callId });
  });

  socket.on("call-rejected", ({ toUserId, callId }) => {
    relay(io, userId, toUserId, "call-rejected", { callId, reason: "rejected" });
  });

  socket.on("call-ended", ({ toUserId, callId }) => {
    relay(io, userId, toUserId, "call-ended", { callId, reason: "ended" });
  });

  socket.on("webrtc-offer", ({ toUserId, callId, sdp, offer }) => {
    const sessionDescription = sdp ?? offer;
    if (!sessionDescription) return;
    relay(io, userId, toUserId, "webrtc-offer", { callId, sdp: sessionDescription });
  });

  socket.on("webrtc-answer", ({ toUserId, callId, sdp, answer }) => {
    const sessionDescription = sdp ?? answer;
    if (!sessionDescription) return;
    relay(io, userId, toUserId, "webrtc-answer", { callId, sdp: sessionDescription });
  });

  socket.on("ice-candidate", ({ toUserId, callId, candidate }) => {
    relay(io, userId, toUserId, "ice-candidate", { callId, candidate });
  });

  socket.on("call-busy", ({ toUserId, callId }) => {
    relay(io, userId, toUserId, "call-busy", { callId, reason: "busy" });
  });

  socket.on("disconnect", () => {
    userSockets.delete(userId);
  });
});
```

---

## 4. Security checks (recommended)

1. **Auth**: Only authenticated sockets can emit call events (same as `send-message`).
2. **Participants**: Verify `toUserId` is the other participant in `chatId` (query your Chat model).
3. **Rate limit**: Optional cap on `call-user` per minute to prevent spam.
4. **Do not** log full SDP bodies in production (large/noisy).

---

## 5. Optional: busy user tracking

```js
const activeCalls = new Set(); // userId strings in a call

socket.on("call-user", ...) => {
  if (activeCalls.has(toUserId)) {
    socket.emit("call-busy", { callId });
    return;
  }
  // on call-accepted: activeCalls.add(callerId); activeCalls.add(calleeId);
  // on call-ended/rejected: remove both
};
```

The frontend also emits `call-busy` when the callee is already in a call.

---

## 6. TURN server (production)

WebRTC uses **STUN** (free, in the frontend). Some networks need **TURN** (relay).

- Deploy [coturn](https://github.com/coturn/coturn) or use a provider (Twilio, Metered.ca).
- Expose credentials via env and optionally an API `GET /api/turn-credentials`.
- Frontend `ICE_SERVERS` in `src/hooks/useWebRTC.ts` can be extended with TURN URLs.

Without TURN, calls often work on **localhost** but may fail between certain home/mobile networks.

---

## 7. Testing checklist

1. User A and B logged in, both in `online-users`.
2. A clicks **Call** → B sees incoming modal.
3. B **Accept** → both hear audio (or see video).
4. Either **End** → both return to chat.
5. B **Decline** → A sees "Call declined".
6. Call while B offline → A sees "User is offline".

---

## 8. Optional: call history (REST)

Not required for WebRTC. Later you can add:

```js
CallLog { chatId, callerId, calleeId, type, status, startedAt, endedAt, duration }
```

Persist on `call-ended` in the backend.
