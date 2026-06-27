/** Metered.ca global relay — use every transport for NAT/firewall traversal in production. */
export function buildIceServers(
  username: string,
  password: string
): RTCIceServer[] {
  const turnUrls = [
    "turn:global.relay.metered.ca:80",
    "turn:global.relay.metered.ca:80?transport=tcp",
    "turn:global.relay.metered.ca:443",
    "turns:global.relay.metered.ca:443?transport=tcp",
  ];

  return [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: turnUrls,
      username,
      credential: password,
    },
  ];
}

/** Fallback when env is set on the client (local dev / build-time NEXT_PUBLIC_*). */
export function getClientIceServers(): RTCIceServer[] {
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const password = process.env.NEXT_PUBLIC_TURN_PASSWORD;
  if (!username || !password) return [{ urls: "stun:stun.relay.metered.ca:80" }];
  return buildIceServers(username, password);
}
