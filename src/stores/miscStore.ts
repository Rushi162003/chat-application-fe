import { create, useStore } from "zustand";
import { Notification } from "@/src/common/types";
import { MeResponse, MessageResponse } from "../common/api-res";


interface MiscStore {
    notification: Notification | null;
    setNotification: (notification: Notification | null) => void;
    onlineUsers: string[] | null;
    setOnlineUsers: (onlineUsers: string[]) => void;
    me: MeResponse | null;
    setMe: (me: MeResponse | null) => void;
    /** Chat thread currently open in UI; used by socket layer for read receipts */
    activeChatId: string | null;
    setActiveChatId: (chatId: string | null) => void;
    messagesRes: MessageResponse | null;
    setMessagesRes: (messages: MessageResponse | null) => void;
}

export const miscStore = create<MiscStore>((set) => ({
    notification: null,
    setNotification: (notification) => set({ notification }),
    onlineUsers: null,
    setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
    me: null,
    setMe: (me) => set({ me }),
    activeChatId: null,
    setActiveChatId: (activeChatId) => set({ activeChatId }),
    messagesRes: null,
    setMessagesRes: (messagesRes) =>
        set((state) => {
            const prev = state.messagesRes;
            if (messagesRes === prev) return state;
            if (
                messagesRes &&
                prev &&
                messagesRes._id === prev._id &&
                messagesRes.__v === prev.__v &&
                messagesRes.updatedAt === prev.updatedAt &&
                JSON.stringify(messagesRes.readBy) === JSON.stringify(prev.readBy) &&
                JSON.stringify(messagesRes.deliveredTo) === JSON.stringify(prev.deliveredTo)
            ) {
                return state;
            }
            return { messagesRes };
        }),
    }));

export const useMiscStore = () => {
    return useStore(miscStore);
};