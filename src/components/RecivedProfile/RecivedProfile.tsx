import styles from "./RecivedProfile.module.scss";
import { ChatResponse } from "@/src/common/api-res";
import { Check, CheckCheck } from "lucide-react";

const getInitials = (value?: string) => {
    if (!value) return "U";
    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
};

type MessageTickStatus = "unread" | "delivered" | "read";

const getMessageTickStatus = (
    senderId?: string,
    readBy?: string[],
    myUserId?: string
): MessageTickStatus => {
    const usersWhoRead = readBy ?? [];
    const isMyMessage = senderId === myUserId;

    if (isMyMessage) {
        const readBySomeoneElse = usersWhoRead.some((id) => id !== myUserId);
        return readBySomeoneElse ? "read" : "delivered";
    }

    return usersWhoRead.includes(myUserId || "") ? "read" : "unread";
};

const RecivedProfile = ({
    profile,
    handleProfileClick,
    myUserId,
}: {
    profile: ChatResponse | null;
    handleProfileClick: (id: string) => void;
    myUserId?: string;
}) => {
    const lastMessageStatus = getMessageTickStatus(
        profile?.lastMessage?.senderId,
        profile?.lastMessage?.readBy,
        myUserId
    );

    const tickClass =
        lastMessageStatus === "read"
            ? styles.rootInfoMessageTickRead
            : lastMessageStatus === "delivered"
                ? styles.rootInfoMessageTickDelivered
                : styles.rootInfoMessageTickUnread;

    return (
        <div onClick={() => handleProfileClick(profile?._id || "")} className={styles.root}>
            <div className={styles.rootAvatar} aria-hidden>
                {getInitials(profile?.receiver?.name)}
            </div>
            <div className={styles.rootInfo}>
                <div className={styles.rootInfoHeader}>
                    <span className={styles.rootInfoHeaderName}>{profile?.receiver?.name || ""}</span>
                    <div className={styles.rootInfoHeaderMeta}>
                        {(profile?.unreadCount || 0) > 0 && (
                            <span className={styles.rootInfoHeaderUnreadCount}>
                                {profile?.unreadCount}
                            </span>
                        )}
                        <span className={styles.rootInfoHeaderTime}>{new Date(profile?.createdAt || "").toLocaleDateString() || ""}</span>
                    </div>
                </div>
                <span className={styles.rootInfoMessage}>
                    {profile?.lastMessage?.senderId === myUserId && (
                        <span className={`${styles.rootInfoMessageTick} ${tickClass}`}>
                            {lastMessageStatus === "unread" ? (
                                <Check size={12} strokeWidth={2.25} />
                            ) : (
                                <CheckCheck size={12} strokeWidth={2.25} />
                            )}
                        </span>
                    )}
                    <span>{profile?.lastMessage?.text || ""}</span>
                </span>
            </div>
        </div>
    );
};

export default RecivedProfile;