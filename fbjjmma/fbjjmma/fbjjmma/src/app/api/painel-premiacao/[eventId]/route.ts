import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: urlEventId } = await params

  // Prioriza o evento com tatames ativos (heartbeat nos últimos 5 minutos)
  const activeOp = await prismaAny.tatameOperation.findFirst({
    where: {
      endedAt: null,
      lastHeartbeat: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    include: { tatame: { select: { eventId: true } } },
    orderBy: { lastHeartbeat: "desc" },
  })
  const eventId = activeOp?.tatame?.eventId ?? urlEventId

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true },
  })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brackets = await (prisma.bracket as any).findMany({
    where: {
      eventId,
      status: { in: ["FINALIZADA", "PREMIADA"] },
    },
    include: {
      weightCategory: { select: { name: true, ageGroup: true, sex: true } },
      positions: {
        include: {
          registration: {
            select: {
              id: true,
              awarded: true,
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
