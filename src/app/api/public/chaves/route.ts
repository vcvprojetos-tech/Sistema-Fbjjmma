import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")

  // Se não for passado um eventId, retorna lista de eventos com chaves disponíveis.
  // Prioriza eventos EM_ANDAMENTO e ENCERRADO (que têm chaves), depois INSCRICOES_ENCERRADAS.
  if (!eventId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allEvents = await (prisma.event as any).findMany({
      where: { status: { not: "RASCUNHO" } },
      select: { id: true, name: true, date: true, status: true },
      orderBy: { date: "desc" },
    })
    const statusPriority: Record<string, number> = {
      EM_ANDAMENTO: 0, ENCERRADO: 1, INSCRICOES_ENCERRADAS: 2, INSCRICOES_ABERTAS: 3,
    }
    const events = [...allEvents].sort((a: { status: string; date: string }, b: { status: string; date: string }) => {
      const diff = (statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3)
      if (diff !== 0) return diff
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    return NextResponse.json({ events })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = await (prisma.event as any).findUnique({
    where: { id: eventId },
    select: { id: true, name: true, date: true, status: true },
  })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brackets = await (prisma.bracket as any).findMany({
    where: { eventId },
    include: {
      weightCategory: {
        select: { id: true, name: true, ageGroup: true, sex: true, maxWeight: true },
      },
      positions: {
        include: {
          registration: {
            select: {
              id: true,
              guestName: true,
              athlete: { include: { user: { select: { name: true } } } },
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { position: "asc" },
      },
      matches: {
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
    orderBy: { bracketNumber: "asc" },
  })

  return NextResponse.json({ event, brackets })
}
