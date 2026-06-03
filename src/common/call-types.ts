export type CallType = "audio" | "video";

export type CallStatus = "idle" | "outgoing" | "incoming" | "connecting" | "in-call";

export type CallEndReason = "ended" | "rejected" | "busy" | "offline" | "missed";

export interface IncomingCallPayload {
  callId: string;
  fromUserId: string;
  fromUserName?: string;
  chatId: string;
  callType: CallType;
}

export interface CallEndedPayload {
  callId: string;
  reason?: CallEndReason;
}

export interface CallUserPayload {
  toUserId: string;
  chatId: string;
  callType: CallType;
  callId: string;
}

export interface CallSignalPayload {
  toUserId: string;
  callId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface CallAcceptedPayload {
  toUserId: string;
  callId: string;
}

export interface CallRejectedPayload {
  toUserId: string;
  callId: string;
}
