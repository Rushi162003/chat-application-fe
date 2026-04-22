"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import RecivedProfile from "../RecivedProfile/RecivedProfile";
import { useSocket } from "@/hooks/useSocket";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

//styles
import styles from "./Chatbox.module.scss";
import { axiosFetch } from "@/hooks/useAxios";
import { API_ENDPOINTS } from "@/src/common/enums";
import Message from "../Snackbar/message";
import { ChatResponse, MessageResponse } from "@/src/common/api-res";
import { miscStore } from "@/src/stores/miscStore";
import { Check, CheckCheck } from "lucide-react";
import type { Socket } from "socket.io-client";

const MESSAGES_PAGE_SIZE = 20;

/** Server may process `read-message` before `join-chat` finishes; ack + fallback avoids that race. */
const READ_AFTER_JOIN_FALLBACK_MS = 250;

function emitJoinChatThenMarkMessagesRead(
  socket: Socket,
  chatId: string,
  readPayloads: { messageId: string; chatId: string }[],
) {
  if (readPayloads.length === 0) {
    socket.emit("join-chat", chatId);
    return;
  }

  let readsEmitted = false;
  const emitReadsOnce = () => {
    if (readsEmitted) return;
    readsEmitted = true;
    readPayloads.forEach((p) => socket.emit("read-message", p));
  };

  socket.emit("join-chat", chatId, () => {
    emitReadsOnce();
  });

  window.setTimeout(emitReadsOnce, READ_AFTER_JOIN_FALLBACK_MS);
}

type OutgoingTickKind = "sent" | "delivered" | "read";

const getOutgoingTickKind = (
  message: MessageResponse,
  myUserId: string,
  peerUserId: string
): OutgoingTickKind => {
  const readByOther = (message.readBy ?? []).some((id) => id !== myUserId);
  if (readByOther) return "read";
  if (peerUserId && (message.deliveredTo ?? []).includes(peerUserId)) return "delivered";
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
    }
    if (error) {
      Message.error(error?.response?.data?.message || "Something went wrong");
    }
  }, []);

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
      const readPayloads = fetchedMessages
        .filter(
          (msg) =>
            msg.senderId !== me?._id && !msg.readBy?.includes(me?._id || "")
        )
        .map((msg) => ({ messageId: msg._id, chatId: id }));
      emitJoinChatThenMarkMessagesRead(socket, id, readPayloads);
    } else if (socket) {
      socket.emit("join-chat", id);
    }
  }, [socket, chats, fetchChatMessages, me?._id]);

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
        await fetchChatMessages(selectedChat._id, messagesPage, true);
      } finally {
        setIsLoadingMoreMessages(false);
      }
    }, 500);
  }, [fetchChatMessages, hasMoreMessages, isLoadingMoreMessages, messagesPage, selectedChat?._id]);

  useEffect(() => {
    return () => {
      if (paginationDebounceTimerRef.current) {
        clearTimeout(paginationDebounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (messagesRes) {
      setMessages((prevMessages) => {
        const isEditing = prevMessages.some((m) => m._id === messagesRes._id);
        if (isEditing) {
          return prevMessages.map((m) => m._id === messagesRes._id ? messagesRes : m);
        }
        return [messagesRes, ...prevMessages];
      });
      fetchChats();
    }
  }, [messagesRes, fetchChats]);

  const displayMessages = useMemo(() => {
    return [...messages];
  }, [messages]);

  return (
    <div className={styles.root}>
      <div className={styles.rootMessages}>
        <div className={styles.rootMessagesHeader}>
          <h2>Messages</h2>
          <button type="button">New Chat</button>
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
    </div>
  );
};

export default memo(Chatbox);
