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

  const table = await prisma.weightTable.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: [{ ageGroup: "asc" }, { sex: "asc" }, { order: "asc" }],
      },
    },
  })

  if (!table) {
    return NextResponse.json({ error: "Tabela não encontrada." }, { status: 404 })
  }

  return NextResponse.json(table)
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
    const { name, isActive, categories } = body

    const table = await prisma.weightTable.findUnique({ where: { id } })
    if (!table) {
      return NextResponse.json({ error: "Tabela não encontrada." }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const updated = await prisma.weightTable.update({
      where: { id },
      data: updateData,
    })

    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (cat.id) {
          await prisma.weightCategory.update({
            where: { id: cat.id },
            data: {
              maxWeight: cat.maxWeight !== undefined ? parseFloat(cat.maxWeight) : undefined,
              order: cat.order !== undefined ? parseInt(cat.order) : undefined,
              name: cat.name || undefined,
            },
          })
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[TABELAS-PESO PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar tabela." }, { status: 500 })
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
    const table = await prisma.weightTable.findUnique({ where: { id } })
    if (!table) {
      return NextResponse.json({ error: "Tabela não encontrada." }, { status: 404 })
    }

    await prisma.weightTable.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Tabela desativada." })
  } catch (error) {
    console.error("[TABELAS-PESO DELETE ERROR]", error)
    return NextResponse.json({ error: "Erro ao desativar tabela." }, { status: 500 })
  }
}
