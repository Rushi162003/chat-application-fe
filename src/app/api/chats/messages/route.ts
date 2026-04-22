import { NextResponse } from "next/server";
import { BE_API_ENDPOINTS } from "@/src/common/enums";
import axios from "axios";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const base = process.env.NEXT_PUBLIC_BE_API_URL ?? "";
    const url = id
        ? `${base}${BE_API_ENDPOINTS.CHATS}/${id}/messages`
        : `${base}${BE_API_ENDPOINTS.CHATS}/messages`;
    try {
        const messages = await axios.get(url, {
            headers: {
                Authorization: `${request.headers.get("Authorization")}`,
            },
            params: {
                ...(page ? { page } : {}),
                ...(limit ? { limit } : {}),
            },
        });
        return NextResponse.json(messages?.data || []);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            return NextResponse.json(error.response.data, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}