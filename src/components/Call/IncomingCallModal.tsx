"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import type { IncomingCallPayload } from "@/src/common/call-types";
import styles from "./Call.module.scss";

type Props = {
  incomingCall: IncomingCallPayload;
  peerName: string;
  onAccept: () => void;
  onReject: () => void;
};

export default function IncomingCallModal({
  incomingCall,
  peerName,
  onAccept,
  onReject,
}: Props) {
  const isVideo = incomingCall.callType === "video";

  return (
    <div className={styles.incomingOverlay}>
      <div className={styles.incomingModal}>
        <div className={styles.incomingIcon}>
          {isVideo ? <Video size={28} /> : <Phone size={28} />}
        </div>
        <h3>{peerName}</h3>
        <p>{isVideo ? "Incoming video call" : "Incoming voice call"}</p>
        <div className={styles.incomingActions}>
          <button type="button" className={styles.rejectBtn} onClick={onReject}>
            <PhoneOff size={18} />
            Decline
          </button>
          <button type="button" className={styles.acceptBtn} onClick={onAccept}>
            <Phone size={18} />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
