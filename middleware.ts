import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function secureHeaders(res: NextResponse) {
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
    return res;
}

export function middleware(req: NextRequest) {
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    const res = NextResponse.next();
    res.headers.set("x-request-id", requestId);

    if (req.nextUrl.pathname.startsWith("/api/")) {
        res.headers.set("Cache-Control", "no-store, max-age=0");
    }

    return secureHeaders(res);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
