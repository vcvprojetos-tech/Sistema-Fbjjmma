import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAction, getClientIP } from "@/lib/audit"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const updated = await prisma.event.update({
    where: { id },
    data: { isActive: !event.isActive },
    select: { isActive: true },
  })

  await logAction({
    userId: session.user.id,
    module: "EVENTOS",
    action: updated.isActive ? "ATIVAR_CHAVES" : "DESATIVAR_CHAVES",
    details: { nome: event.name },
    ip: getClientIP(req),
  })

  return NextResponse.json({ isActive: updated.isActive })
}
