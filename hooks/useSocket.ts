import { io } from "socket.io-client";
import Cookies from "js-cookie";
export const useSocket = () => {
    const token = Cookies.get("access");
    const socket = io(process.env.NEXT_PUBLIC_BE_API_URL, {
        auth: {
            token
        }
    });

    socket.on("connect", () => {
        console.log("connected to socket");
    });

    return socket;
}