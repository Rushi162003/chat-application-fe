import { NextResponse } from "next/server";
import { BE_API_ENDPOINTS } from "@/src/common/enums";

export async function POST(request: Request) {
    const base = process.env.NEXT_PUBLIC_BE_API_URL ?? "";
    const url = `${base}${BE_API_ENDPOINTS.UPLOAD + "/image"}`;
    try {
        const formData = await request.formData();
        console.log("url================", formData);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `${request.headers.get("Authorization")}`,
            },
            body: formData,
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
