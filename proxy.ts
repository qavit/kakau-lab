import { NextResponse, type NextRequest } from "next/server";

const PRODUCTION_HOST = "lab.kakau.tw";

/** URL-driven locale selection only; never redirect based on browser preferences. */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-kakau-locale", request.nextUrl.pathname === "/en" || request.nextUrl.pathname.startsWith("/en/") ? "en" : "zh-TW");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Only the production host is indexable; workers.dev, preview and local hosts must not compete with it.
  if (request.nextUrl.hostname !== PRODUCTION_HOST) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/((?!_next|favicon.svg).*)"] };
