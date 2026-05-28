import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, ensureEventIsActive } from "@/lib/db"

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  await ensureEventIsActive()

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, isActive: true } })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const updated = await prisma.event.update({
    where: { id },
    data: { isActive: !event.isActive },
    select: { isActive: true },
  })

  return NextResponse.json({ isActive: updated.isActive })
}
