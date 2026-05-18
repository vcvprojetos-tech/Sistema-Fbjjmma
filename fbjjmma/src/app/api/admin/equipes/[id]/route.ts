import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const { id } = await params

  const team = await prisma.team.findUnique({
    where: { id },
    include: { _count: { select: { athletes: true } } },
  })

  if (!team) {
    return NextResponse.json({ error: "Equipe não encontrada." }, { status: 404 })
  }

  return NextResponse.json(team)
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
    const { name, isActive } = body

    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return NextResponse.json({ error: "Equipe não encontrada." }, { status: 404 })
    }

    if (name && name.trim() !== team.name) {
      const existing = await prisma.team.findFirst({
        where: { name: name.trim(), id: { not: id } },
      })
      if (existing) {
        return NextResponse.json(
          { error: "Já existe uma equipe com este nome." },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.team.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[EQUIPES PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar equipe." }, { status: 500 })
  }
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

  try {
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return NextResponse.json({ error: "Equipe não encontrada." }, { status: 404 })
    }

    await prisma.team.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Equipe desativada." })
  } catch (error) {
    console.error("[EQUIPES DELETE ERROR]", error)
    return NextResponse.json({ error: "Erro ao desativar equipe." }, { status: 500 })
  }
}
