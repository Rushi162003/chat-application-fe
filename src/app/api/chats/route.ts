import { NextResponse } from "next/server";
import { BE_API_ENDPOINTS } from "@/src/common/enums";
import axios from "axios";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const base = process.env.NEXT_PUBLIC_BE_API_URL ?? "";
    const url = id
        ? `${base}${BE_API_ENDPOINTS.CHATS}?id=${encodeURIComponent(id)}`
        : `${base}${BE_API_ENDPOINTS.CHATS}`;
    try {
        const chats = await axios.get(url, {
            headers: {
                Authorization: `${request.headers.get("Authorization")}`,
            },
        });
        return NextResponse.json(chats?.data || []);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            return NextResponse.json(error.response.data, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}