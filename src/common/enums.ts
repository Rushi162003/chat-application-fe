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
}