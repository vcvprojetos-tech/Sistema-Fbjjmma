import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Pool } from "pg"

function getPgPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL! })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
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

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { name, email, phone, role, isActive, cpf } = body

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json(
          { error: "E-mail já em uso." },
          { status: 400 }
        )
      }
    }

    if (cpf && cpf !== user.cpf) {
      const existingCpf = await prisma.user.findFirst({
        where: { cpf, id: { not: id } },
      })
      if (existingCpf) {
        return NextResponse.json(
          { error: "CPF já em uso por outro usuário." },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name || undefined,
        email: email || undefined,
        phone: phone !== undefined ? phone || null : undefined,
        role: role || undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        cpf: cpf || undefined,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[USUARIOS PUT ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao atualizar usuário." },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  if (body.action === "restore") {
    try {
      const pool = getPgPool()
      await pool.query(`UPDATE users SET "deletedAt" = NULL WHERE id = $1`, [id])
      await pool.end()
      return NextResponse.json({ message: "Usuário restaurado." })
    } catch (error) {
      console.error("[USUARIOS RESTORE ERROR]", error)
      return NextResponse.json({ error: "Erro ao restaurar usuário." }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const permanent = searchParams.get("permanent") === "1"

  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    if (permanent) {
      await prisma.tatameOperation.deleteMany({ where: { userId: id } })
      await prisma.auditLog.deleteMany({ where: { userId: id } })
      await prisma.eventCoordinator.deleteMany({ where: { userId: id } })
      await prisma.user.delete({ where: { id } })
      return NextResponse.json({ message: "Usuário excluído permanentemente." })
    }

    const pool = getPgPool()
    await pool.query(`UPDATE users SET "deletedAt" = NOW() WHERE id = $1`, [id])
    await pool.end()
    return NextResponse.json({ message: "Usuário movido para a lixeira." })
  } catch (error) {
    console.error("[USUARIOS DELETE ERROR]", error)
    return NextResponse.json(
      { error: "Erro ao excluir usuário." },
      { status: 500 }
    )
  }
}
