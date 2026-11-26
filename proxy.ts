import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const protectedApiPrefixes = [
  "/api/projects",
  "/api/feedback",
  "/api/settings",
  "/api/dashboard",
  "/api/labels",
  "/api/views",
];
const publicApiPaths = ["/api/projects/public-list"];

export async function proxy(request: NextRequest) {
  if (publicApiPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  const isProtectedApi = protectedApiPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/feedback/:path*",
    "/settings/:path*",
    "/guide/:path*",
    "/api/projects/:path*",
    "/api/feedback/:path*",
    "/api/settings/:path*",
    "/api/dashboard/:path*",
    "/api/labels/:path*",
    "/api/views/:path*",
  ],
};
