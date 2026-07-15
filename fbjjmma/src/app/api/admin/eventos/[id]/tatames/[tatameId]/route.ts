import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAction, getClientIP } from "@/lib/audit"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tatameId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, tatameId } = await params

  try {
    const body = await req.json()
    const { name, isActive } = body

    const [tatame, event] = await Promise.all([
      prisma.tatame.findFirst({ where: { id: tatameId, eventId: id } }),
      prisma.event.findUnique({ where: { id }, select: { name: true } }),
    ])
    if (!tatame) return NextResponse.json({ error: "Tatame não encontrado." }, { status: 404 })

    const updated = await prisma.tatame.update({
      where: { id: tatameId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    })

    await logAction({
      userId: session.user.id,
      module: "EVENTOS",
      action: "EDITAR_TATAME",
      details: { evento: event?.name ?? id, tatame: updated.name },
      ip: getClientIP(req),
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[TATAME PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao atualizar tatame." }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tatameId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, tatameId } = await params

  try {
    const [tatame, event] = await Promise.all([
      prisma.tatame.findFirst({ where: { id: tatameId, eventId: id } }),
      prisma.event.findUnique({ where: { id }, select: { name: true } }),
    ])
    if (!tatame) return NextResponse.json({ error: "Tatame não encontrado." }, { status: 404 })

    // Remove dependencies before deleting
    await prisma.tatameOperation.deleteMany({ where: { tatameId } })
    await prisma.bracket.updateMany({ where: { tatameId }, data: { tatameId: null } })
    await prisma.tatame.delete({ where: { id: tatameId } })

    await logAction({
      userId: session.user.id,
      module: "EVENTOS",
      action: "EXCLUIR_TATAME",
      details: { evento: event?.name ?? id, tatame: tatame.name },
      ip: getClientIP(req),
    })

    return NextResponse.json({ message: "Tatame excluído." })
  } catch (error) {
    console.error("[TATAME DELETE ERROR]", error)
    return NextResponse.json({ error: "Erro ao excluir tatame." }, { status: 500 })
  }
}
