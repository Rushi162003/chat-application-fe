import { miscStore } from "@/src/stores/miscStore";

const Message = {
    error: (msg: string) => {
        const { setNotification } = miscStore.getState();
        setNotification({ message: msg, type: "e" });
    },
    success: (msg: string) => {
        const { setNotification } = miscStore.getState();
        setNotification({ message: msg, type: "s" });
    },
    warning: (msg: string) => {
        const { setNotification } = miscStore.getState();
        setNotification({ message: msg, type: "w" });
    },
    info: (msg: string) => {
        const { setNotification } = miscStore.getState();
        setNotification({ message: msg, type: "i" });
    }
};

export default Message;
