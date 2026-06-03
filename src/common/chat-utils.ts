import type { ChatResponse } from "./api-res";

export function getChatPeerId(chat: ChatResponse, myUserId: string): string {
  return chat.sender?._id === myUserId
    ? chat.receiver?._id || ""
    : chat.sender?._id || "";
}

export function getChatPeerName(chat: ChatResponse, myUserId: string): string {
  return chat.sender?._id === myUserId
    ? chat.receiver?.name || "User"
    : chat.sender?.name || "User";
}
