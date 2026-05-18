import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get("all") === "1"
  const counts = searchParams.get("counts") === "1"

  const teams = await prisma.team.findMany({
    where: all ? {} : { isActive: true },
    orderBy: { name: "asc" },
    include: counts ? { _count: { select: { athletes: true } } } : undefined,
  })
  return NextResponse.json(teams)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    }

    const existing = await prisma.team.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma equipe com este nome." },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: { name: name.trim() },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error("[EQUIPES POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao criar equipe." }, { status: 500 })
  }
}
