import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export const { handlers, auth: _auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "CPF ou E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
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

        return {
          id: resolvedUser.id,
          name: resolvedUser.name,
          email: resolvedUser.email,
          cpf: resolvedUser.cpf,
          role: resolvedUser.role,
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
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.cpf = token.cpf as string
        session.user.role = token.role as string
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
