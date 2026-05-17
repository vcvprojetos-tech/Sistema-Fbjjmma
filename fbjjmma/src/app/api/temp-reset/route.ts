import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const SECRET = "fbjjmma-reset-2026"

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const { email, cpf, newPassword } = await req.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Senha deve ter mínimo 6 caracteres." }, { status: 400 })
    }

    const bcrypt = await import("bcryptjs")
    const hash = await bcrypt.hash(newPassword, 10)

    const where = cpf
      ? { cpf: cpf.replace(/\D/g, "") }
      : { email }

    const user = await prisma.user.findFirst({ where })
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
