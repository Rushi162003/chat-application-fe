"use client";

import { useEffect, useRef } from "react";

function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline className={styles.hiddenAudio} />;
}

import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type { CallStatus, CallType } from "@/src/common/call-types";
import styles from "./Call.module.scss";

type Props = {
  callStatus: CallStatus;
  callType: CallType;
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
};

export default function CallOverlay({
  callStatus,
  callType,
  peerName,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const statusLabel =
    callStatus === "outgoing"
      ? "Calling…"
      : callStatus === "connecting"
        ? "Connecting…"
        : callStatus === "in-call"
          ? "In call"
          : "";

  const showVideo = callType === "video";

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>{peerName}</h3>
          <p>{statusLabel}</p>
        </div>

        <div className={styles.videoArea}>
          {showVideo ? (
            <>
              <video
                ref={remoteVideoRef}
                className={styles.remoteVideo}
                autoPlay
                playsInline
              />
              <video
                ref={localVideoRef}
                className={styles.localVideo}
                autoPlay
                playsInline
                muted
              />
            </>
          ) : (
            <div className={styles.audioAvatar}>
              <span>{peerName.charAt(0).toUpperCase()}</span>
              <RemoteAudio stream={remoteStream} />
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlBtn}
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          {showVideo && (
            <button
              type="button"
              className={styles.controlBtn}
              onClick={onToggleVideo}
              aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
            >
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}
          <button
            type="button"
            className={`${styles.controlBtn} ${styles.endBtn}`}
            onClick={onEndCall}
            aria-label="End call"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
