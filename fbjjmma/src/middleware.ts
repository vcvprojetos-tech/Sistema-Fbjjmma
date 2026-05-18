import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { nextUrl } = req

  const isAdminRoute = nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/")
  const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin")

  if (!isAdminRoute && !isApiAdminRoute) {
    return NextResponse.next()
  }

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")

  if (!hasSession) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
