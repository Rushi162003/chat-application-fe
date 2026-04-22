import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/signup"];
const ME_API_PATH = "/api/auth/me";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access")?.value;
  const isMeApiPath =
    pathname === ME_API_PATH || pathname.startsWith(`${ME_API_PATH}/`);

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isPublicPath) {
    if (pathname === "/login" && accessToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isMeApiPath && !accessToken) {
    return NextResponse.json(
      { message: "Unauthorized. Please login first." },
      { status: 401 }
    );
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
