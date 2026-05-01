"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import RecivedProfile from "../RecivedProfile/RecivedProfile";
import { useSocket } from "@/hooks/useSocket";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

//styles
import styles from "./Chatbox.module.scss";
import { axiosFetch } from "@/hooks/useAxios";
import { API_ENDPOINTS, SOCKET_EVENTS } from "@/src/common/enums";
import Message from "../Snackbar/message";
import { ChatResponse, MessageResponse, User } from "@/src/common/api-res";
import { miscStore } from "@/src/stores/miscStore";
import { Check, CheckCheck } from "lucide-react";
import type { Socket } from "socket.io-client";

const MESSAGES_PAGE_SIZE = 20;

/** Server may process `read-message` before `join-chat` finishes; ack + fallback avoids that race. */
const READ_AFTER_JOIN_FALLBACK_MS = 250;

function emitJoinChatThenDeliverThenRead(
  socket: Socket,
  chatId: string,
  deliverPayloads: { messageId: string; chatId: string }[],
  readPayloads: { messageId: string; chatId: string }[],
) {
  if (deliverPayloads.length === 0 && readPayloads.length === 0) {
    socket.emit("join-chat", chatId);
    return;
  }

  let sideEffectsEmitted = false;
  const emitDeliverAndReadsOnce = () => {
    if (sideEffectsEmitted) return;
    sideEffectsEmitted = true;
    deliverPayloads.forEach((p) => socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, p));
    readPayloads.forEach((p) => socket.emit("read-message", p));
  };

  socket.emit("join-chat", chatId, () => {
    emitDeliverAndReadsOnce();
  });

  window.setTimeout(emitDeliverAndReadsOnce, READ_AFTER_JOIN_FALLBACK_MS);
}

type OutgoingTickKind = "sent" | "delivered" | "read";

const getOutgoingTickKind = (
  message: MessageResponse,
  myUserId: string,
  peerUserId: string
): OutgoingTickKind => {
  const readByOther = (message.readBy ?? []).some((id) => id !== myUserId);
  if (readByOther) return "read";

  const delivered = message.deliveredTo ?? [];
  const deliveredToPeer = Boolean(peerUserId && delivered.includes(peerUserId));
  const deliveredToSomeoneElse = delivered.some((id) => id && id !== myUserId);
  if (deliveredToPeer || deliveredToSomeoneElse) return "delivered";

  return "sent";
};

const Chatbox = () => {
  const router = useRouter();
  const socket = useSocket();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const paginationDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onlineUsers = miscStore((state) => state.onlineUsers);
  const me = miscStore((state) => state.me);
  const messagesRes = miscStore((state) => state.messagesRes);
  const setActiveChatId = miscStore((state) => state.setActiveChatId);

  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatResponse[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [searchUserEmail, setSearchUserEmail] = useState("");

  const handleSendMessage = useCallback(() => {
    if (message.trim()) {
      socket?.emit('send-message', { text: message, chatId: selectedChat?._id });
      setMessage("");
    }
  }, [message, socket, selectedChat?._id]);

  const fetchChats = useCallback(async () => {
    const [response, error] = await axiosFetch({
      method: "GET",
      url: API_ENDPOINTS.CHATS,
    });
    if (response) {
      setChats(response);
      return response as ChatResponse[];
    }
    if (error) {
      Message.error(error?.response?.data?.message || "Something went wrong");
    }
    return [] as ChatResponse[];
  }, []);

  const fetchUsers = useCallback(async (email: string) => {
    setIsUsersLoading(true);
    const [response, error] = await axiosFetch({
      method: "GET",
      url: API_ENDPOINTS.USERS,
      requestConfig: {
        params: {
          search: email,
        },
      },
    });
    setIsUsersLoading(false);
    if (response) {
      const incomingUsers = (response as User[]).filter((u) => u._id !== me?._id);
      setUsers(incomingUsers);
      return;
    }
    if (error) {
      Message.error(error?.response?.data?.message || "Something went wrong");
    }
  }, [me?._id, searchUserEmail]);

  const handleOpenNewChatModal = useCallback(async () => {
    setSearchUserEmail("");
    setShowNewChatModal(true);
    // await fetchUsers();
  }, []);

  const debounce = (func: (email: string) => void, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (email: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(email), delay);
    };
  };

  const debouncedFetchUsers = useCallback(debounce((email: string) => fetchUsers(email), 1000), []);

  const handleSearchUser = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchUserEmail(e.target.value);
    if (e.target.value.trim() === "") {
      setUsers([]);
      return;
    }
    debouncedFetchUsers(e.target.value.trim());
  }, [debouncedFetchUsers]);

  // const filteredUsers = useMemo(() => {
  //   const normalizedQuery = searchUserEmail.trim().toLowerCase();
  //   if (!normalizedQuery) return users;
  //   return users.filter((user) => user.email?.toLowerCase().includes(normalizedQuery));
  // }, [users, searchUserEmail]);

  const handleLogout = useCallback(() => {
    Cookies.remove("access");
    socket?.disconnect();
    router.replace("/login");
  }, [router, socket]);

  const fetchChatMessages = useCallback(async (chatId: string, page: number, append: boolean) => {
    const [response, error] = await axiosFetch({
      method: "GET",
      url: API_ENDPOINTS.MESSAGES,
      requestConfig: {
        params: {
          id: chatId,
          page,
          limit: MESSAGES_PAGE_SIZE,
        },
      },
    });
    if (error) {
      Message.error(error?.response?.data?.message || "Something went wrong");
      return null;
    }
    const incomingMessages = Array.isArray(response) ? response as MessageResponse[] : [];
    setHasMoreMessages(incomingMessages.length === MESSAGES_PAGE_SIZE);

    if (append) {
      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map((m) => m._id));
        const uniqueIncoming = incomingMessages.filter((m) => !existingIds.has(m._id));
        return [...prevMessages, ...uniqueIncoming];
      });
      setMessagesPage((prevPage) => prevPage + 1);
      return incomingMessages;
    }

    setMessages(incomingMessages);
    setMessagesPage(2);
    return incomingMessages;
  }, []);

  const handleProfileClick = useCallback(async (id: string) => {
    setSelectedChat(chats.find((chat) => chat._id === id) || null);
    setChats((prevChats) => prevChats.map((chat) => (
      chat._id === id ? { ...chat, unreadCount: 0 } : chat
    )));
    setMessages([]);
    setMessagesPage(1);
    setHasMoreMessages(true);
    setIsLoadingMoreMessages(false);
    const fetchedMessages = await fetchChatMessages(id, 1, false);
    if (fetchedMessages && socket) {
      const myId = me?._id || "";
      const deliverPayloads = fetchedMessages
        .filter(
          (msg) =>
            msg.senderId !== myId && !(msg.deliveredTo ?? []).includes(myId)
        )
        .map((msg) => ({ messageId: msg._id, chatId: id }));
      const readPayloads = fetchedMessages
        .filter(
          (msg) =>
            msg.senderId !== myId && !msg.readBy?.includes(myId)
        )
        .map((msg) => ({ messageId: msg._id, chatId: id }));
      emitJoinChatThenDeliverThenRead(socket, id, deliverPayloads, readPayloads);
    } else if (socket) {
      socket.emit("join-chat", id);
    }
  }, [socket, chats, fetchChatMessages, me?._id]);

  const handleStartNewChat = useCallback(async (userId: string) => {
    setIsStartingChat(true);
    const [response, error] = await axiosFetch({
      method: "POST",
      url: API_ENDPOINTS.CHATS,
      requestConfig: {
        data: {
          type: "direct",
          participants: [me?._id, userId]
        },
      },
    });
    setIsStartingChat(false);
    if (error) {
      Message.error(error?.response?.data?.message || "Unable to start chat");
      return;
    }

    const refreshedChats = await fetchChats();
    const createdChatId =
      (response as { _id?: string; chatId?: string; chat?: { _id?: string } } | null)?._id ||
      (response as { _id?: string; chatId?: string; chat?: { _id?: string } } | null)?.chatId ||
      (response as { _id?: string; chatId?: string; chat?: { _id?: string } } | null)?.chat?._id;

    const targetChat =
      refreshedChats.find((c) => c._id === createdChatId) ||
      refreshedChats.find((c) => c.receiver?._id === userId || c.sender?._id === userId);

    if (targetChat?._id) {
      setShowNewChatModal(false);
      await handleProfileClick(targetChat._id);
      return;
    }
    Message.error("Chat created, but could not open it automatically.");
  }, [fetchChats, handleProfileClick, me?._id]);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedChat?._id]);

  useEffect(() => {
    setActiveChatId(selectedChat?._id ?? null);
    return () => setActiveChatId(null);
  }, [selectedChat?._id, setActiveChatId]);

  const handleMessagesScroll = useCallback(() => {
    if (paginationDebounceTimerRef.current) {
      clearTimeout(paginationDebounceTimerRef.current);
    }

    paginationDebounceTimerRef.current = setTimeout(async () => {
      const container = contentRef.current;
      if (!container || !selectedChat?._id || !hasMoreMessages || isLoadingMoreMessages) {
        return;
      }

      const threshold = 10;
      const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
      const isNearZero = container.scrollTop <= threshold;
      const isNearMax = maxScrollTop - container.scrollTop <= threshold;

      // `column-reverse` can report top position differently by browser/layout direction.
      if (!isNearZero && !isNearMax) {
        return;
      }

      setIsLoadingMoreMessages(true);
      try {
        const page = await fetchChatMessages(selectedChat._id, messagesPage, true);
        const myId = me?._id;
        if (page?.length && socket && myId) {
          page.forEach((msg) => {
            if (msg.senderId !== myId && !(msg.deliveredTo ?? []).includes(myId)) {
              socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
                messageId: msg._id,
                chatId: selectedChat._id,
              });
            }
          });
        }
      } finally {
        setIsLoadingMoreMessages(false);
      }
    }, 500);
  }, [fetchChatMessages, hasMoreMessages, isLoadingMoreMessages, messagesPage, selectedChat?._id, me?._id, socket]);

  useEffect(() => {
    return () => {
      if (paginationDebounceTimerRef.current) {
        clearTimeout(paginationDebounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (messagesRes && selectedChat?._id === messagesRes.chatId) {
      setMessages((prevMessages) => {
        const isEditing = prevMessages.some((m) => m._id === messagesRes._id);
        if (isEditing) {
          return prevMessages.map((m) => {
            if (m._id !== messagesRes._id) return m;
            return {
              ...m,
              ...messagesRes,
              readBy: messagesRes.readBy !== undefined ? messagesRes.readBy : m.readBy,
              deliveredTo:
                messagesRes.deliveredTo !== undefined ? messagesRes.deliveredTo : m.deliveredTo,
            };
          });
        }
        return [messagesRes, ...prevMessages];
      });
    }
    if (messagesRes) fetchChats();
  }, [messagesRes, fetchChats, selectedChat?._id]);

  const displayMessages = useMemo(() => {
    return [...messages];
  }, [messages]);

  return (
    <div className={styles.root}>
      <div className={styles.rootMessages}>
        <div className={styles.rootMessagesHeader}>
          <h2>Messages</h2>
          <button type="button" onClick={handleOpenNewChatModal}>New Chat</button>
        </div>

        <div className={styles.rootMessagesList}>
          {chats.map((item) => (
            <RecivedProfile key={`${item.receiver?.name}-yesterday`} profile={item} handleProfileClick={handleProfileClick} myUserId={me?._id || ""} />
          ))}
        </div>
      </div>
      {selectedChat && (
        <div className={styles.rootChatbox}>
          <div className={styles.rootHeader}>
            <div className={styles.rootHeaderProfile}>
              <div className={`${styles.rootHeaderProfileDot} ${onlineUsers?.includes(selectedChat?.receiver?._id || "") ? styles.rootHeaderProfileDotOnline : styles.rootHeaderProfileDotOffline}`} />
              <div>
                <h1>{selectedChat?.receiver?.name || ""}</h1>
                <p>{onlineUsers?.includes(selectedChat?.receiver?._id || "") ? "Online" : "Offline"}</p>
              </div>
            </div>
            <div className={styles.rootHeaderActions}>
              <button type="button" aria-label="Voice Call">
                Call
              </button>
              <button type="button" aria-label="Video Call">
                Video
              </button>
              <button type="button" aria-label="Open More Options">
                More
              </button>
              <button type="button" aria-label="Logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <div className={styles.rootContent} ref={contentRef} onScroll={handleMessagesScroll}>
            {displayMessages.map((m) => {
              const isMine = m.senderId === me?._id;
              const peerId =
                selectedChat.sender?._id === me?._id
                  ? selectedChat.receiver?._id || ""
                  : selectedChat.sender?._id || "";
              const outgoingKind = isMine ? getOutgoingTickKind(m, me?._id || "", peerId) : null;
              const tickClass =
                outgoingKind === "read"
                  ? styles.rootContentTickRead
                  : outgoingKind === "delivered"
                    ? styles.rootContentTickDelivered
                    : styles.rootContentTickUnread;

              return (
                <div
                  key={m._id}
                  className={
                    isMine ? styles.rootContentSent : styles.rootContentReceived
                  }
                >
                  <p>{m.text}</p>
                  <div
                    className={`${styles.rootContentMeta} ${isMine ? styles.rootContentMeta_end : ""}`}
                  >
                    <span className={styles.rootContentTime}>
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                    {isMine && outgoingKind && (
                      <span
                        className={`${styles.rootContentTick} ${tickClass}`}
                        aria-label={
                          outgoingKind === "read"
                            ? "Read"
                            : outgoingKind === "delivered"
                              ? "Delivered"
                              : "Sent"
                        }
                      >
                        {outgoingKind === "sent" ? (
                          <Check size={14} strokeWidth={2.25} />
                        ) : (
                          <CheckCheck size={14} strokeWidth={2.25} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.rootFooter}>
            <button type="button" aria-label="Attach File">
              +
            </button>
            <input onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} onChange={(e) => setMessage(e.target.value)} type="text" placeholder="Type a message..." value={message} />
            <button onClick={() => handleSendMessage()} type="button" aria-label="Send Message">
              Send
            </button>
          </div>
        </div>)}
      {showNewChatModal && (
        <div className={styles.newChatOverlay} onClick={() => !isStartingChat && setShowNewChatModal(false)}>
          <div className={styles.newChatModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.newChatHeader}>
              <h3>Start New Chat</h3>
              <button type="button" onClick={() => setShowNewChatModal(false)} disabled={isStartingChat}>Close</button>
            </div>
            <div className={styles.newChatSearch}>
              <input
                type="email"
                placeholder="Search user by email"
                value={searchUserEmail}
                disabled={isUsersLoading || isStartingChat}
                onChange={(e) => {
                  // setSearchUserEmail(e.target.value);
                  handleSearchUser(e);
                }}
              />
              {isUsersLoading && <p className={styles.newChatSearchLoading}>Searching users...</p>}
            </div>
            <div className={styles.newChatList}>
              {isUsersLoading && (
                <div className={styles.newChatLoadingList}>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className={styles.newChatLoadingItem} />
                  ))}
                </div>
              )}
              {!isUsersLoading && users.length === 0 && <p className={styles.newChatEmpty}>No user found.</p>}
              {!isUsersLoading && users.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  className={styles.newChatUser}
                  onClick={() => handleStartNewChat(user._id)}
                  disabled={isStartingChat || isUsersLoading}
                >
                  <span>{user.name}</span>
                  <small>{user.email}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(Chatbox);
