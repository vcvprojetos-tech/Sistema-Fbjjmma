import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { nextUrl } = req

  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin")

  const cookieHeader = req.headers.get("cookie") || ""
  const isLoggedIn =
    cookieHeader.includes("authjs.session-token=") ||
    cookieHeader.includes("__Secure-authjs.session-token=")

  if ((isAdminRoute || isApiAdminRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
