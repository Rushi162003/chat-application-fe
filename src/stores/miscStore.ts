import { create, useStore } from "zustand";
import { Notification } from "@/src/common/types";


interface MiscStore {
    notification: Notification | null;
    setNotification: (notification: Notification | null) => void;
}

export const miscStore = create<MiscStore>((set) => ({
    notification: null,
    setNotification: (notification) => set({ notification }),
}));

export const useMiscStore = () => {
    return useStore(miscStore);
};