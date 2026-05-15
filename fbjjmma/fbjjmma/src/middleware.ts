import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const { nextUrl } = req

  const isAdminRoute = nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/")
  const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin")

  if (!isAdminRoute && !isApiAdminRoute) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string | undefined
  const canAccessAdmin = role === "PRESIDENTE" || role === "COORDENADOR_GERAL"

  if (!canAccessAdmin) {
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
