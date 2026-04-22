"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { miscStore } from "@/src/stores/miscStore";
import { MessageResponse } from "@/src/common/api-res";

type MessageReceiptPayload = {
  type: "read" | "delivered";
  chatId: string;
  message: MessageResponse;
};

/** Let `join-chat` complete on the server before `read-message` (same ordering issue as opening a chat). */
const READ_RECEIVED_MESSAGE_DELAY_MS = 200;

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const setOnlineUsers = miscStore((state) => state.setOnlineUsers);
  const setMessagesRes = miscStore((state) => state.setMessagesRes);

  useEffect(() => {
    if (socketRef.current) return;

    const token = Cookies.get("access");
    socketRef.current = io(process.env.NEXT_PUBLIC_BE_API_URL as string, {
      auth: { token },
    });
    setSocket(socketRef.current);

    socketRef.current.on("connect", () => {
      console.log("connected to socket");
    });

    socketRef.current.on("online-users", (onlineUsers: string[]) => {
      setOnlineUsers(onlineUsers);
    });

    socketRef.current.on("receive-message", (message: MessageResponse) => {
      setMessagesRes(message);

      const { activeChatId, me } = miscStore.getState();
      const myId = me?._id;
      const isOpenChat = Boolean(activeChatId && message.chatId === activeChatId);
      const isIncoming = myId && message.senderId !== myId;
      const notYetReadByMe = myId && !message.readBy?.includes(myId);

      if (isOpenChat && isIncoming && notYetReadByMe) {
        const pending = message;
        window.setTimeout(() => {
          const { activeChatId: stillOpen, me: stillMe } = miscStore.getState();
          const stillMyId = stillMe?._id;
          if (
            !stillMyId ||
            stillOpen !== pending.chatId ||
            pending.senderId === stillMyId ||
            pending.readBy?.includes(stillMyId)
          ) {
            return;
          }
          socketRef.current?.emit("read-message", {
            messageId: pending._id,
            chatId: pending.chatId,
          });
        }, READ_RECEIVED_MESSAGE_DELAY_MS);
      }
    });

    socketRef.current.on("read-message", (message: MessageResponse) => {
      setMessagesRes(message);
    });

    socketRef.current.on("message-receipt", (payload: MessageReceiptPayload) => {
      if (payload?.message) {
        setMessagesRes(payload.message);
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [setMessagesRes, setOnlineUsers]);

  return socket;
};
