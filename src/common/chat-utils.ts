import type { ChatResponse, MessageResponse, User } from "./api-res";

export function isGroupChat(chat: ChatResponse): boolean {
  return chat.type === "group";
}

export function getChatDisplayName(chat: ChatResponse, myUserId: string): string {
  if (isGroupChat(chat)) return chat.name || "Group";
  return getChatPeerName(chat, myUserId);
}

/** Resolve a group message's sender name from the populated message or the chat participants. */
export function getGroupSenderName(chat: ChatResponse, message: MessageResponse): string {
  if (message.sender?.name) return message.sender.name;
  const participant = chat.participants?.find(
    (p): p is User => typeof p !== "string" && p._id === message.senderId
  );
  return participant?.name || "Member";
}

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
