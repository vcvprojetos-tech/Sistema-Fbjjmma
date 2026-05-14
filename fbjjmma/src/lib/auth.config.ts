import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAdminRoute =
        nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/")
      const isApiAdminRoute = nextUrl.pathname.startsWith("/api/admin")

      if (!isAdminRoute && !isApiAdminRoute) return true

      const role = (auth?.user as { role?: string } | undefined)?.role

      if (!auth?.user) {
        const loginUrl = new URL("/login", nextUrl.origin)
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
        return Response.redirect(loginUrl)
      }

      if (role !== "PRESIDENTE" && role !== "COORDENADOR_GERAL") {
        return Response.redirect(new URL("/login", nextUrl.origin))
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id
        token.cpf = (user as { cpf?: string }).cpf
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.cpf = token.cpf as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  providers: [],
}
