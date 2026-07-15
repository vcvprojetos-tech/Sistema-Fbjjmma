import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { logAction } from "@/lib/audit"

export const { handlers, auth: _auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "CPF ou E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        const identifier = credentials.identifier as string
        const password = credentials.password as string

        const isCpf = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(identifier)

        const user = await prisma.user.findFirst({
          where: isCpf
            ? { cpf: identifier.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") }
            : { email: identifier },
        })

        let resolvedUser = user
        if (!resolvedUser && isCpf) {
          const rawCpf = identifier.replace(/\D/g, "")
          resolvedUser = await prisma.user.findFirst({
            where: { cpf: rawCpf },
          })
        }

        if (!resolvedUser) return null

        const isPasswordValid = await bcrypt.compare(password, resolvedUser.password)
        if (!isPasswordValid) return null

        const req = request as Request
        const ip = req?.headers?.get?.("x-forwarded-for") ?? req?.headers?.get?.("x-real-ip") ?? null
        const userAgent = req?.headers?.get?.("user-agent") ?? null

        logAction({
          userId: resolvedUser.id,
          module: "SISTEMA",
          action: "LOGIN",
          details: { nome: resolvedUser.name, perfil: resolvedUser.role },
          ip: ip ?? undefined,
        }).catch(() => {})

        // Gera token único para esta sessão
        const sessionToken = crypto.randomUUID()
        let sessionId: string | undefined

        try {
          const sessionRecord = await (prisma as any).userSession.create({
            data: { sessionToken, userId: resolvedUser.id, ip, userAgent },
          })
          sessionId = sessionRecord.id
        } catch {
          // Falha não crítica — sessão continua mas sem controle individual
        }

        // Limpa qualquer force-logout anterior ao fazer novo login
        prisma.user.update({ where: { id: resolvedUser.id }, data: { forceLogoutAt: null } }).catch(() => {})

        return {
          id: resolvedUser.id,
          name: resolvedUser.name,
          email: resolvedUser.email,
          cpf: resolvedUser.cpf,
          role: resolvedUser.role,
          sessionToken,
          sessionId,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.cpf = (user as { cpf?: string }).cpf
        token.role = (user as { role?: string }).role
        token.sessionToken = (user as { sessionToken?: string }).sessionToken
        token.sessionId = (user as { sessionId?: string }).sessionId
      } else if (
        token.id &&
        ["PRESIDENTE", "COORDENADOR_GERAL", "COORDENADOR_TATAME", "CUSTOM"].includes(token.role as string)
      ) {
        if (token.sessionToken) {
          // Verifica se esta sessão específica ainda é válida
          const userSession = await (prisma as any).userSession.findUnique({
            where: { sessionToken: token.sessionToken },
            select: { invalidatedAt: true, user: { select: { isActive: true } } },
          })
          if (!userSession || userSession.invalidatedAt || !userSession.user?.isActive) {
            return null
          }
        } else {
          // Fallback: sessões antigas sem sessionToken usam forceLogoutAt
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isActive: true, forceLogoutAt: true },
          })
          if (!dbUser || !dbUser.isActive) return null
          if (dbUser.forceLogoutAt && (token.iat as number) * 1000 < dbUser.forceLogoutAt.getTime()) {
            return null
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.cpf = token.cpf as string
        session.user.role = token.role as string
        session.user.sessionId = token.sessionId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})

export const auth: typeof _auth = _auth
