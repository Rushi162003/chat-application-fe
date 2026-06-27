"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@/src/common/enums";
import type {
  CallEndedPayload,
  CallStatus,
  CallType,
  IncomingCallPayload,
} from "@/src/common/call-types";
import Message from "@/src/components/Snackbar/message";
import { getClientIceServers } from "@/src/common/ice-servers";

let cachedIceServers: RTCIceServer[] | null = null;

async function resolveIceServers(): Promise<RTCIceServer[]> {
  if (cachedIceServers) return cachedIceServers;

  try {
    const res = await fetch("/api/turn-credentials");
    if (res.ok) {
      const data = (await res.json()) as { iceServers?: RTCIceServer[] };
      if (data.iceServers?.length) {
        cachedIceServers = data.iceServers;
        return cachedIceServers;
      }
    }
  } catch {
    /* fall back to build-time env */
  }

  cachedIceServers = getClientIceServers();
  return cachedIceServers;
}

export type { CallStatus }; 

export function useWebRTC(socket: Socket | null) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerName, setPeerName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef("");
  const peerUserIdRef = useRef("");
  const chatIdRef = useRef("");
  const isCallerRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callStatusRef = useRef<CallStatus>("idle");
  const callTypeRef = useRef<CallType>("audio");

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    callIdRef.current = "";
    peerUserIdRef.current = "";
    chatIdRef.current = "";
    isCallerRef.current = false;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setCallStatus("idle");
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const emitToPeer = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (!socket?.connected || !peerUserIdRef.current || !callIdRef.current) return;
      socket.emit(event, {
        toUserId: peerUserIdRef.current,
        callId: callIdRef.current,
        ...payload,
      });
    },
    [socket]
  );

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const pending = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore stale candidates */
      }
    }
  }, []);

  const addIceCandidateSafe = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const attachLocalStream = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const createPeerConnection = useCallback(async () => {
    const iceServers = await resolveIceServers();
    const hasTurn = iceServers.some(
      (s) =>
        typeof s.urls === "string"
          ? s.urls.startsWith("turn")
          : s.urls.some((u) => u.startsWith("turn"))
    );
    if (!hasTurn) {
      console.warn(
        "TURN credentials missing — calls may fail outside localhost. Set TURN_USERNAME and TURN_PASSWORD in production."
      );
    }

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitToPeer(SOCKET_EVENTS.ICE_CANDIDATE, {
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStream(stream);
        setCallStatus("in-call");
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallStatus("in-call");
      }
      if (pc.connectionState === "failed") {
        Message.error("Call connection failed");
        cleanupMedia();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const ice = pc.iceConnectionState;
      if (ice === "connected" || ice === "completed") {
        setCallStatus("in-call");
      }
      if (ice === "failed") {
        Message.error("Call connection failed");
        cleanupMedia();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanupMedia, emitToPeer]);

  const getUserMedia = useCallback(async (type: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices not supported");
    }
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
  }, []);

  const endCall = useCallback(
    (notifyPeer = true) => {
      if (notifyPeer && socket?.connected && peerUserIdRef.current && callIdRef.current) {
        socket.emit(SOCKET_EVENTS.CALL_ENDED, {
          toUserId: peerUserIdRef.current,
          callId: callIdRef.current,
        });
      }
      cleanupMedia();
    },
    [cleanupMedia, socket]
  );

  const startCall = useCallback(
    async (peerUserId: string, chatId: string, peerDisplayName: string, type: CallType) => {
      if (!socket?.connected) {
        Message.error("Not connected to server");
        return;
      }
      if (callStatusRef.current !== "idle") {
        Message.warning("Already in a call");
        return;
      }

      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      peerUserIdRef.current = peerUserId;
      chatIdRef.current = chatId;
      isCallerRef.current = true;
      setCallType(type);
      setPeerName(peerDisplayName);
      setCallStatus("outgoing");

      try {
        const stream = await getUserMedia(type);
        const pc = await createPeerConnection();
        attachLocalStream(pc, stream);
        socket.emit(SOCKET_EVENTS.CALL_USER, {
          toUserId: peerUserId,
          chatId,
          callType: type,
          callId,
        });
      } catch {
        Message.error("Could not access microphone or camera");
        cleanupMedia();
      }
    },
    [attachLocalStream, cleanupMedia, createPeerConnection, getUserMedia, socket]
  );

  const acceptCall = useCallback(async () => {
    const incoming = incomingCall;
    if (!incoming || !socket?.connected) return;

    callIdRef.current = incoming.callId;
    peerUserIdRef.current = incoming.fromUserId;
    chatIdRef.current = incoming.chatId;
    isCallerRef.current = false;
    setCallType(incoming.callType);
    setPeerName(incoming.fromUserName || "User");
    setIncomingCall(null);
    setCallStatus("connecting");

    try {
      const stream = await getUserMedia(incoming.callType);
      const pc = await createPeerConnection();
      attachLocalStream(pc, stream);
      socket.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        toUserId: incoming.fromUserId,
        callId: incoming.callId,
      });
    } catch {
      Message.error("Could not access microphone or camera");
      socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
        toUserId: incoming.fromUserId,
        callId: incoming.callId,
      });
      cleanupMedia();
    }
  }, [
    attachLocalStream,
    cleanupMedia,
    createPeerConnection,
    getUserMedia,
    incomingCall,
    socket,
  ]);

  const rejectCall = useCallback(() => {
    const incoming = incomingCall;
    if (!incoming || !socket?.connected) {
      cleanupMedia();
      return;
    }
    socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
      toUserId: incoming.fromUserId,
      callId: incoming.callId,
    });
    cleanupMedia();
  }, [cleanupMedia, incomingCall, socket]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOff(!videoTrack.enabled);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = (payload: IncomingCallPayload) => {
      if (callStatusRef.current !== "idle") {
        socket.emit(SOCKET_EVENTS.CALL_BUSY, {
          toUserId: payload.fromUserId,
          callId: payload.callId,
        });
        return;
      }
      setIncomingCall(payload);
      setCallType(payload.callType);
      setPeerName(payload.fromUserName || "User");
      setCallStatus("incoming");
    };

    const onCallAccepted = async (payload?: { callId?: string }) => {
      if (!isCallerRef.current || !pcRef.current) return;
      if (payload?.callId && payload.callId !== callIdRef.current) return;
      setCallStatus("connecting");
      try {
        const offer = await pcRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callTypeRef.current === "video",
        });
        await pcRef.current.setLocalDescription(offer);
        emitToPeer(SOCKET_EVENTS.WEBRTC_OFFER, { sdp: offer });
      } catch {
        Message.error("Failed to start call");
        endCall(true);
      }
    };

    const onCallRejected = (payload: CallEndedPayload) => {
      if (payload.callId !== callIdRef.current) return;
      Message.info("Call declined");
      cleanupMedia();
    };

    const onCallEnded = (payload: CallEndedPayload) => {
      if (payload.callId !== callIdRef.current) return;
      cleanupMedia();
    };

    const onCallBusy = (payload: CallEndedPayload) => {
      if (payload.callId !== callIdRef.current) return;
      Message.warning("User is busy");
      cleanupMedia();
    };

    const onCallOffline = (payload: CallEndedPayload) => {
      if (payload.callId !== callIdRef.current) return;
      Message.error("User is offline");
      cleanupMedia();
    };

    const parseSessionDescription = (
      payload: { sdp?: RTCSessionDescriptionInit; offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit }
    ): RTCSessionDescriptionInit | null => {
      return payload.sdp ?? payload.offer ?? payload.answer ?? null;
    };

    const onWebRtcOffer = async (payload: {
      callId: string;
      fromUserId?: string;
      sdp?: RTCSessionDescriptionInit;
      offer?: RTCSessionDescriptionInit;
    }) => {
      if (payload.callId !== callIdRef.current || isCallerRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;
      const sdp = parseSessionDescription(payload);
      if (!sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitToPeer(SOCKET_EVENTS.WEBRTC_ANSWER, { sdp: answer });
        setCallStatus("connecting");
      } catch {
        Message.error("Failed to connect call");
        endCall(true);
      }
    };

    const onWebRtcAnswer = async (payload: {
      callId: string;
      fromUserId?: string;
      sdp?: RTCSessionDescriptionInit;
      answer?: RTCSessionDescriptionInit;
    }) => {
      if (payload.callId !== callIdRef.current || !isCallerRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;
      const sdp = parseSessionDescription(payload);
      if (!sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(pc);
        setCallStatus("connecting");
      } catch {
        Message.error("Failed to connect call");
        endCall(true);
      }
    };

    const onIceCandidate = (payload: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (payload.callId !== callIdRef.current) return;
      addIceCandidateSafe(payload.candidate);
    };

    socket.on(SOCKET_EVENTS.INCOMING_CALL, onIncomingCall);
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, onCallAccepted);
    socket.on(SOCKET_EVENTS.CALL_REJECTED, onCallRejected);
    socket.on(SOCKET_EVENTS.CALL_ENDED, onCallEnded);
    socket.on(SOCKET_EVENTS.CALL_BUSY, onCallBusy);
    socket.on(SOCKET_EVENTS.CALL_OFFLINE, onCallOffline);
    socket.on(SOCKET_EVENTS.WEBRTC_OFFER, onWebRtcOffer);
    socket.on(SOCKET_EVENTS.WEBRTC_ANSWER, onWebRtcAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, onIceCandidate);

    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_CALL, onIncomingCall);
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, onCallAccepted);
      socket.off(SOCKET_EVENTS.CALL_REJECTED, onCallRejected);
      socket.off(SOCKET_EVENTS.CALL_ENDED, onCallEnded);
      socket.off(SOCKET_EVENTS.CALL_BUSY, onCallBusy);
      socket.off(SOCKET_EVENTS.CALL_OFFLINE, onCallOffline);
      socket.off(SOCKET_EVENTS.WEBRTC_OFFER, onWebRtcOffer);
      socket.off(SOCKET_EVENTS.WEBRTC_ANSWER, onWebRtcAnswer);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, onIceCandidate);
    };
  }, [
    addIceCandidateSafe,
    cleanupMedia,
    emitToPeer,
    endCall,
    flushPendingCandidates,
    socket,
  ]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (callStatusRef.current !== "idle") {
        endCall(true);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [endCall]);

  const isCallActive = callStatus !== "idle";

  return {
    callStatus,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    peerName,
    isMuted,
    isVideoOff,
    isCallActive,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
