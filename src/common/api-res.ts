export interface ApiResponse<T> {
    data: T;
    message: string;
    status: number;
}

export interface User {
    _id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MeResponse {
    _id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatResponse {
    _id: string;
    sender: User;
    receiver: User;
    lastMessage: MessageResponse;
    createdAt: Date;
    updatedAt: Date;
    unreadCount: number;
}

export interface MessageResponse {
    _id: string;
    chatId: string;
    senderId: string;
    text: string;
    readBy: string[];
    deliveredTo: string[];
    createdAt: Date;
    updatedAt: Date;
    __v: number;
}
