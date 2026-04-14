import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, status: true },
  })
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })

  const cutoff = new Date(Date.now() - 2 * 60 * 1000)

  // Tatames com coordenador ativo (heartbeat nos últimos 2 min)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tatames = await (prisma.tatame as any).findMany({
    where: {
      eventId,
      isActive: true,
      operations: {
        some: { endedAt: null, lastHeartbeat: { gte: cutoff } },
      },
    },
    include: {
      operations: {
        where: { endedAt: null, lastHeartbeat: { gte: cutoff } },
        include: { user: { select: { name: true } } },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      brackets: {
        where: { status: { in: ["EM_ANDAMENTO", "DESIGNADA"] } },
        include: {
          weightCategory: { select: { name: true, ageGroup: true, sex: true } },
          matches: {
            where: { endedAt: null, position1Id: { not: null } },
            include: {
              position1: {
                include: {
                  registration: {
                    include: {
                      athlete: { include: { user: { select: { name: true } } } },
                    },
                  },
                },
              },
              position2: {
                include: {
                  registration: {
                    include: {
                      athlete: { include: { user: { select: { name: true } } } },
                    },
                  },
                },
              },
            },
            orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
          },
        },
        orderBy: { bracketNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ event, tatames })
}
