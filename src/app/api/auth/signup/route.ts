import axios from "axios";
import { NextResponse } from "next/server";
import { BE_API_ENDPOINTS } from "@/src/common/enums";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const base = process.env.NEXT_PUBLIC_BE_API_URL ?? "";
    const payload = body?.data?.refresh ? body.data : body;

    const response = await axios.post(base + BE_API_ENDPOINTS.SIGNUP, payload);
    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return NextResponse.json(error.response.data, {
        status: error.response.status,
      });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
