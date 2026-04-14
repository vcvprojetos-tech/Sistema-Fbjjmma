import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const includeAthletes = searchParams.get("includeAthletes") === "1"
  const nome = searchParams.get("nome") || ""
  const role = searchParams.get("role") || ""

  const where: Record<string, unknown> = {}

  if (!includeAthletes) {
    where.role = { not: "ATLETA" }
  }

  if (role) {
    where.role = role
  }

  if (nome) {
    where.name = { contains: nome, mode: "insensitive" }
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      cpf: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, cpf, email, password, phone, role } = body

    const isCoordenadorTatame = role === "COORDENADOR_TATAME"

    if (!name || !cpf) {
      return NextResponse.json(
        { error: "Nome e CPF são obrigatórios." },
        { status: 400 }
      )
    }

    if (!isCoordenadorTatame && (!email || !password)) {
      return NextResponse.json(
        { error: "Nome, CPF, e-mail e senha são obrigatórios." },
        { status: 400 }
      )
    }

    const resolvedEmail = isCoordenadorTatame
      ? `${cpf.replace(/\D/g, "")}@coordenador.fbjjmma`
      : email

    const existing = await prisma.user.findFirst({
      where: { OR: [{ cpf: cpf.replace(/\D/g, "") }, { email: resolvedEmail }] },
    })
    if (existing) {
      return NextResponse.json(
        { error: "CPF já cadastrado." },
        { status: 400 }
      )
    }

    const bcrypt = await import("bcryptjs")
    const resolvedPassword = isCoordenadorTatame
      ? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      : password
    const hashed = await bcrypt.hash(resolvedPassword, 10)

    const user = await prisma.user.create({
      data: {
        name,
        cpf: cpf.replace(/\D/g, ""),
        email: resolvedEmail,
        password: hashed,
        phone: phone || null,
        role: role || "COORDENADOR_GERAL",
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("[USUARIOS POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 })
  }
}
