import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    include: { tatames: { select: { id: true } } },
  })

  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const tatameIds = event.tatames.map((t) => t.id)

  await prisma.$transaction([
    // Encerra todas as operações ativas de coordenadores
    prisma.tatameOperation.updateMany({
      where: { tatameId: { in: tatameIds }, endedAt: null },
      data: { endedAt: new Date() },
    }),
    // Marca o evento como encerrado
    prisma.event.update({
      where: { id },
      data: { status: "ENCERRADO" },
    }),
  ])

  // Notifica os coordenadores via SSE para que vejam o status encerrado
  for (const tatameId of tatameIds) {
    notifyTatame(tatameId)
  }

  return NextResponse.json({ ok: true })
}
