import { NextResponse } from "next/server";
import { buildIceServers } from "@/src/common/ice-servers";

export async function GET() {
  const username =
    process.env.NEXT_PUBLIC_TURN_USERNAME;
  const password =
    process.env.NEXT_PUBLIC_TURN_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: "TURN credentials not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ iceServers: buildIceServers(username, password) });
}
