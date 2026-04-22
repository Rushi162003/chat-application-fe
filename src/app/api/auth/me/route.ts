import { NextResponse } from "next/server";
import { BE_API_ENDPOINTS } from "@/src/common/enums";
import axios from "axios";

export async function GET(request: Request) {
    const base = process.env.NEXT_PUBLIC_BE_API_URL ?? "";
    const url = `${base}${BE_API_ENDPOINTS.ME}`;
    try {
        console.log("url", request.headers.get("Authorization"));
        const me = await axios.get(url, {
            headers: {
                Authorization: `${request.headers.get("Authorization")}`,
            },
        });
        return NextResponse.json(me?.data || []);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            return NextResponse.json(error.response.data, { status: error.response.status });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}