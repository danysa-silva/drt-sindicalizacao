import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/verify-token";

const PUBLICAS = ["/login", "/cadastro", "/api/auth/login", "/api/auth/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publica = PUBLICAS.some((p) => pathname.startsWith(p));
  if (publica) return NextResponse.next();

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
