import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function getTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(payload)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const { nextUrl } = req

  const isAdminRoute = nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/")
  const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin")

  if (!isAdminRoute && !isApiAdminRoute) {
    return NextResponse.next()
  }

  const rawToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value

  if (!rawToken) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = getTokenPayload(rawToken)
  const role = payload?.role as string | undefined

  const canAccessAdmin = role === "PRESIDENTE" || role === "COORDENADOR_GERAL"

  if (!canAccessAdmin) {
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
