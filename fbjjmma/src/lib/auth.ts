import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
})
