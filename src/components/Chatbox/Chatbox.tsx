"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import RecivedProfile from "../RecivedProfile/RecivedProfile";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import IncomingCallModal from "../Call/IncomingCallModal";
import CallOverlay from "../Call/CallOverlay";
import { getChatPeerId, getChatPeerName } from "@/src/common/chat-utils";
import type { CallType } from "@/src/common/call-types";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

//styles
import styles from "./Chatbox.module.scss";
import { axiosFetch } from "@/hooks/useAxios";
import { API_ENDPOINTS, SOCKET_EVENTS } from "@/src/common/enums";
import Message from "../Snackbar/message";
import { ChatResponse, MessageResponse, User } from "@/src/common/api-res";
import { miscStore } from "@/src/stores/miscStore";
import { ArrowLeft, Check, CheckCheck, Image as ImageIcon, MapPin, MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Socket } from "socket.io-client";
import LocationMessageCard from "../LocationMap/LocationMessageCard";

const MESSAGES_PAGE_SIZE = 20;
const MAX_IMAGE_SIZE_MB = 5;

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

const getInitials = (value?: string) => {
  if (!value) return "U";
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
};

const Chatbox = () => {
  const router = useRouter();
  const socket = useSocket();

  const {
    callStatus,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    peerName: callPeerName,
    isMuted,
    isVideoOff,
    isCallActive,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC(socket);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const paginationDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onlineUsers = miscStore((state) => state.onlineUsers);
  const me = miscStore((state) => state.me);
  const messagesRes = miscStore((state) => state.messagesRes);
  const setActiveChatId = miscStore((state) => state.setActiveChatId);
  const deletedMessageEvent = miscStore((state) => state.deletedMessageEvent);
  const setDeletedMessageEvent = miscStore((state) => state.setDeletedMessageEvent);

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
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const handleStartEditMessage = useCallback((msg: MessageResponse) => {
    setEditingMessageId(msg._id);
    setEditingMessageText(msg.text);
    setActiveMessageMenuId(null);
    setMessage("");
  }, []);

  const handleCancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setEditingMessageText("");
  }, []);

  const handleSaveEditMessage = useCallback(() => {
    const trimmed = editingMessageText.trim();
    if (!trimmed || !editingMessageId || !selectedChat?._id || !socket) return;

    socket.emit(SOCKET_EVENTS.EDIT_MESSAGE, {
      messageId: editingMessageId,
      chatId: selectedChat._id,
      text: trimmed,
    });

    setMessages((prev) =>
      prev.map((m) =>
        m._id === editingMessageId ? { ...m, text: trimmed, isEdited: true } : m
      )
    );
    handleCancelEditMessage();
    fetchChats();
  }, [editingMessageId, editingMessageText, selectedChat?._id, socket, handleCancelEditMessage, fetchChats]);

  const handleDeleteMessage = useCallback(
    (msg: MessageResponse) => {
      if (!selectedChat?._id || !socket) return;
      const confirmed = window.confirm("Delete this message?");
      if (!confirmed) return;

      socket.emit(SOCKET_EVENTS.DELETE_MESSAGE, {
        messageId: msg._id,
        chatId: selectedChat._id,
      });

      setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      setActiveMessageMenuId(null);
      if (editingMessageId === msg._id) handleCancelEditMessage();
      fetchChats();
    },
    [selectedChat?._id, socket, editingMessageId, handleCancelEditMessage, fetchChats]
  );

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

  const handleBackToList = useCallback(() => {
    setActiveMessageMenuId(null);
    handleCancelEditMessage();
    setSelectedChat(null);
    setActiveChatId(null);
    setMessages([]);
  }, [handleCancelEditMessage, setActiveChatId]);

  const handleProfileClick = useCallback(async (id: string) => {
    setActiveMessageMenuId(null);
    handleCancelEditMessage();
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
  }, [socket, chats, fetchChatMessages, me?._id, handleCancelEditMessage]);

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

  const handleShareLocation = useCallback(() => {
    if (!selectedChat?._id || !socket) return;

    if (!navigator.geolocation) {
      Message.error("Geolocation is not supported in this browser.");
      return;
    }

    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        socket.emit("send-message", {
          chatId: selectedChat._id,
          type: "location",
          location: { lat, lng },
        });
        setIsSharingLocation(false);
        setShowAttachModal(false);
      },
      (err) => {
        setIsSharingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          Message.error("Location permission denied.");
        } else {
          Message.error("Could not get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [socket, selectedChat?._id]);

  const handleStartCall = useCallback(
    (type: CallType) => {
      if (!selectedChat?._id || !me?._id) return;
      if (isCallActive) {
        Message.warning("Already in a call");
        return;
      }
      const peerId = getChatPeerId(selectedChat, me._id);
      if (!peerId) return;
      if (!onlineUsers?.includes(peerId)) {
        Message.error("User is offline");
        return;
      }
      startCall(peerId, selectedChat._id, getChatPeerName(selectedChat, me._id), type);
    },
    [selectedChat, me?._id, onlineUsers, isCallActive, startCall]
  );

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedChat?._id || !socket) return;
    if (!file.type.startsWith("image/")) {
      Message.error("Please select an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      Message.error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    const [response, error] = await axiosFetch({
      method: "POST",
      url: API_ENDPOINTS.UPLOAD,
      requestConfig: { data: formData },
    });
    setIsUploadingImage(false);
    const imageUrl = (response as { imageUrl?: string; url?: string } | null)?.imageUrl
      || (response as { url?: string } | null)?.url;
    if (error || !imageUrl) {
      Message.error(error?.response?.data?.message || "Image upload failed.");
      return;
    }
    socket.emit("send-message", {
      chatId: selectedChat._id,
      type: "image",
      image: imageUrl,
    });
    setShowAttachModal(false);
  }, [socket, selectedChat?._id]);

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
    if (!deletedMessageEvent) return;
    if (deletedMessageEvent.chatId === selectedChat?._id) {
      setMessages((prev) => prev.filter((m) => m._id !== deletedMessageEvent.messageId));
      if (editingMessageId === deletedMessageEvent.messageId) {
        handleCancelEditMessage();
      }
      fetchChats();
    }
    setDeletedMessageEvent(null);
  }, [deletedMessageEvent, selectedChat?._id, editingMessageId, handleCancelEditMessage, fetchChats, setDeletedMessageEvent]);

  useEffect(() => {
    const closeMenu = () => setActiveMessageMenuId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewImage]);

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
              isEdited: messagesRes.isEdited ?? m.isEdited,
            };
          });
        }
        return [messagesRes, ...prevMessages];
      });
    }
    if (messagesRes) fetchChats();
  }, [messagesRes, fetchChats, selectedChat?._id]);

  const displayMessages = useMemo(() => {
    console.log('messages', messages);
    return [...messages];
  }, [messages]);

  return (
    <div className={styles.root}>
      <div
        className={`${styles.rootMessages} ${selectedChat ? styles.rootMessages_mobileHidden : ""}`}
      >
        <div className={styles.rootMessagesMeCard}>
          <div className={styles.rootMessagesMeCardAvatar}>{getInitials(me?.name)}</div>
          <div className={styles.rootMessagesMeCardInfo}>
            <h3>{me?.name || "User"}</h3>
            <p>{me?.email || "No email"}</p>
          </div>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className={styles.rootMessagesHeader}>
          <div>
            <h2>Messages</h2>
            <p>Start or continue your conversations</p>
          </div>
          <button type="button" onClick={handleOpenNewChatModal}>New Chat</button>
        </div>

        <div className={styles.rootMessagesList}>
          {chats.map((item) => (
            <RecivedProfile key={`${item.receiver?.name}-yesterday`} profile={item} handleProfileClick={handleProfileClick} myUserId={me?._id || ""} selectedChatId={selectedChat?._id || ""} />
          ))}
        </div>
      </div>
      <div
        className={`${styles.rootChatbox} ${!selectedChat ? styles.rootChatbox_mobileHidden : ""}`}
      >
        {selectedChat ? (
          <>
            <div className={styles.rootHeader}>
              <div className={styles.rootHeaderProfile}>
                <button
                  type="button"
                  className={styles.rootHeaderBack}
                  aria-label="Back to chats"
                  onClick={handleBackToList}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className={`${styles.rootHeaderProfileDot} ${onlineUsers?.includes(getChatPeerId(selectedChat, me?._id || "")) ? styles.rootHeaderProfileDotOnline : styles.rootHeaderProfileDotOffline}`} />
                <div>
                  <h1>{getChatPeerName(selectedChat, me?._id || "")}</h1>
                  <p>{onlineUsers?.includes(getChatPeerId(selectedChat, me?._id || "")) ? "Online" : "Offline"}</p>
                </div>
              </div>
              <div className={styles.rootHeaderActions}>
                <button
                  type="button"
                  aria-label="Voice Call"
                  disabled={isCallActive}
                  onClick={() => handleStartCall("audio")}
                >
                  Call
                </button>
                <button
                  type="button"
                  aria-label="Video Call"
                  disabled={isCallActive}
                  onClick={() => handleStartCall("video")}
                >
                  Video
                </button>
                {/* <button type="button" aria-label="Open More Options">
                  More
                </button> */}
              </div>
            </div>

            <div className={styles.rootContent} ref={contentRef} onScroll={handleMessagesScroll}>
              {displayMessages.map((m, index) => {
                const isMine = m.senderId === me?._id;
                const isNewestMessage = index === 0;
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

                const isLocationMessage = m.type === "location" && Boolean(m.location);
                const isImageMessage = m.type === "image" && Boolean(m.image);

                return (
                  <div
                    key={m._id}
                    className={`${isMine ? styles.rootContentSent : styles.rootContentReceived} ${editingMessageId === m._id ? styles.rootContentEditing : ""} ${isLocationMessage ? styles.rootContentLocationBubble : ""} ${isImageMessage ? styles.rootContentImageBubble : ""}`}
                  >
                    {isMine && (
                      <div className={styles.rootContentToolbar}>
                        <button
                          type="button"
                          className={styles.rootContentActionsTrigger}
                          aria-label="Message options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMessageMenuId((prev) => (prev === m._id ? null : m._id));
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {activeMessageMenuId === m._id && (
                          <div
                            className={`${styles.rootContentActionsMenu} ${isNewestMessage ? styles.rootContentActionsMenuUp : ""}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {m.type !== "location" && m.type !== "image" && (
                              <button type="button" onClick={() => handleStartEditMessage(m)}>
                                <Pencil size={14} />
                                Edit
                              </button>
                            )}
                            <button type="button" onClick={() => handleDeleteMessage(m)}>
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {isLocationMessage && m.location ? (
                      <div className={styles.rootContentMap}>
                        <LocationMessageCard lat={m.location.lat} lng={m.location.lng} />
                      </div>
                    ) : isImageMessage && m.image ? (
                      <button
                        type="button"
                        className={styles.rootContentImageLink}
                        aria-label="View image"
                        onClick={() => setPreviewImage(m.image || null)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.image}
                          alt="Shared image"
                          className={styles.rootContentImage}
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <p className={styles.rootContentText}>{m.text}</p>
                    )}
                    <div
                      className={`${styles.rootContentMeta} ${isMine ? styles.rootContentMeta_end : ""}`}
                    >
                      {m.isEdited && <span className={styles.rootContentEdited}>edited</span>}
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

            <div className={`${styles.rootFooter} ${editingMessageId ? styles.rootFooterEditing : ""}`}>
              {editingMessageId ? (
                <>
                  <input
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEditMessage();
                      if (e.key === "Escape") handleCancelEditMessage();
                    }}
                    onChange={(e) => setEditingMessageText(e.target.value)}
                    type="text"
                    placeholder="Edit message..."
                    value={editingMessageText}
                  />
                  <button type="button" onClick={handleCancelEditMessage}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveEditMessage} aria-label="Save edited message">
                    Save
                  </button>
                </>
              ) : (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageSelect}
                  />
                  <button
                    type="button"
                    className={styles.rootFooterAttachBtn}
                    aria-label="Attach"
                    onClick={() => setShowAttachModal(true)}
                  >
                    <Plus size={18} />
                  </button>
                  <input onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} onChange={(e) => setMessage(e.target.value)} type="text" placeholder="Type a message..." value={message} />
                  <button
                    className={styles.rootFooterSendBtn}
                    onClick={() => handleSendMessage()}
                    type="button"
                    aria-label="Send Message"
                  >
                    Send
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className={styles.rootEmptyState}>
            <div className={styles.rootEmptyStateBadge}>{getInitials(me?.name)}</div>
            <h2>Welcome, {me?.name || "there"}!</h2>
            <p>Select a chat from the sidebar or click <strong>New Chat</strong> to start a conversation.</p>
            <button type="button" onClick={handleOpenNewChatModal}>
              Start New Chat
            </button>
          </div>
        )}
      </div>
      {previewImage && (
        <div className={styles.imagePreviewOverlay} onClick={() => setPreviewImage(null)}>
          <button
            type="button"
            className={styles.imagePreviewClose}
            aria-label="Close image preview"
            onClick={() => setPreviewImage(null)}
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Image preview"
            className={styles.imagePreviewImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {callStatus === "incoming" && incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          peerName={callPeerName}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      {(callStatus === "outgoing" || callStatus === "connecting" || callStatus === "in-call") && (
        <CallOverlay
          callStatus={callStatus}
          callType={callType}
          peerName={callPeerName}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onEndCall={() => endCall(true)}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}
      {showAttachModal && selectedChat && (
        <div
          className={styles.attachOverlay}
          onClick={() => !isSharingLocation && !isUploadingImage && setShowAttachModal(false)}
        >
          <div className={styles.attachModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.attachHeader}>
              <h3>Share</h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                disabled={isSharingLocation || isUploadingImage}
              >
                Close
              </button>
            </div>
            <div className={styles.attachOptions}>
              <button
                type="button"
                className={styles.attachOption}
                onClick={handleShareLocation}
                disabled={isSharingLocation || isUploadingImage}
              >
                <span className={`${styles.attachOptionIcon} ${styles.attachOptionIcon_location}`}>
                  <MapPin size={20} />
                </span>
                <span>{isSharingLocation ? "Getting location…" : "Current location"}</span>
                <small>Share your live GPS position</small>
              </button>
              <button
                type="button"
                className={styles.attachOption}
                onClick={() => imageInputRef.current?.click()}
                disabled={isSharingLocation || isUploadingImage}
              >
                <span className={`${styles.attachOptionIcon} ${styles.attachOptionIcon_image}`}>
                  <ImageIcon size={20} />
                </span>
                <span>{isUploadingImage ? "Uploading…" : "Image"}</span>
                <small>Send a photo from your device</small>
              </button>
            </div>
          </div>
        </div>
      )}
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
