export enum API_ENDPOINTS {
    LOGIN = "/api/auth/login",
    SIGNUP = "/api/auth/signup",
    ME = "/auth/me",
    USERS = "/users",
    CHATS = "/chats",
    MESSAGES = "/chats/messages",
}

export enum BE_API_ENDPOINTS {
    LOGIN = "/api/auth/login",
    SIGNUP = "/api/auth/signup",
    ME = "/api/auth/me",
    USERS = "/api/users",
    CHATS = "/api/chats",
}

export enum PAGES {
    LOGIN = "/login",
    HOME = "/home",
    CHATBOX = "/chatbox",   
}

/** Socket.io event names — keep in sync with your backend */
export enum SOCKET_EVENTS {
    MESSAGE_DELIVERED = "message-delivered",
    EDIT_MESSAGE = "edit-message",
    DELETE_MESSAGE = "delete-message",
    MESSAGE_EDITED = "message-edited",
    MESSAGE_DELETED = "message-deleted",
    /** WebRTC call signaling — see docs/BACKEND_CALLS.md */
    CALL_USER = "call-user",
    INCOMING_CALL = "incoming-call",
    CALL_ACCEPTED = "call-accepted",
    CALL_REJECTED = "call-rejected",
    CALL_ENDED = "call-ended",
    CALL_BUSY = "call-busy",
    CALL_OFFLINE = "call-offline",
    WEBRTC_OFFER = "webrtc-offer",
    WEBRTC_ANSWER = "webrtc-answer",
    ICE_CANDIDATE = "ice-candidate",
}