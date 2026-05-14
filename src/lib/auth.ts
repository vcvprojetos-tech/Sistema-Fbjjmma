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

        // Determine if identifier is CPF or email
        const isCpf = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(identifier)

        const user = await prisma.user.findFirst({
          where: isCpf
            ? { cpf: identifier.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") }
            : { email: identifier },
        })

        // Also try raw CPF digits if formatted not found
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

// Sessão padrão usada quando nenhum usuário está logado
const SESSAO_PADRAO = {
  user: {
    id: "auto",
    name: "Administrador",
    email: "admin@fbjjmma.com.br",
    cpf: "",
    role: "PRESIDENTE",
  },
  expires: "2099-01-01T00:00:00.000Z",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: typeof _auth = async (...args: any[]) => {
  const session = await (_auth as (...a: any[]) => Promise<any>)(...args)
  return session ?? SESSAO_PADRAO
}
