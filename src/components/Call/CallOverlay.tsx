"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  const localBoxRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [localBoxPos, setLocalBoxPos] = useState<{ x: number; y: number } | null>(null);

  const handleLocalBoxPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = localBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    e.preventDefault();
    box.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
  }, []);

  const handleLocalBoxPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const box = localBoxRef.current;
    const area = box?.parentElement;
    if (!drag || !box || !area) return;
    const areaRect = area.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const maxX = Math.max(areaRect.width - boxRect.width, 0);
    const maxY = Math.max(areaRect.height - boxRect.height, 0);
    const x = Math.min(Math.max(drag.origX + e.clientX - drag.startX - areaRect.left, 0), maxX);
    const y = Math.min(Math.max(drag.origY + e.clientY - drag.startY - areaRect.top, 0), maxY);
    setLocalBoxPos({ x, y });
  }, []);

  const handleLocalBoxPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    localBoxRef.current?.releasePointerCapture(e.pointerId);
  }, []);

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
              <div
                ref={localBoxRef}
                className={styles.localVideoBox}
                style={
                  localBoxPos
                    ? { left: localBoxPos.x, top: localBoxPos.y, right: "auto", bottom: "auto" }
                    : undefined
                }
                onPointerDown={handleLocalBoxPointerDown}
                onPointerMove={handleLocalBoxPointerMove}
                onPointerUp={handleLocalBoxPointerUp}
                onPointerCancel={handleLocalBoxPointerUp}
              >
                <video
                  ref={localVideoRef}
                  className={styles.localVideo}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
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
