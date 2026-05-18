import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get("all") === "1"
  const counts = searchParams.get("counts") === "1"

  const tables = await prisma.weightTable.findMany({
    where: all ? {} : { isActive: true },
    orderBy: { name: "asc" },
    include: counts ? { _count: { select: { categories: true } } } : undefined,
  })
  return NextResponse.json(tables)
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

    const existing = await prisma.weightTable.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma tabela com este nome." },
        { status: 400 }
      )
    }

    const table = await prisma.weightTable.create({
      data: { name: name.trim() },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error("[TABELAS-PESO POST ERROR]", error)
    return NextResponse.json({ error: "Erro ao criar tabela." }, { status: 500 })
  }
}
