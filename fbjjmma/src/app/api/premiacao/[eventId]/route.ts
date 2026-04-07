import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { eventId } = await params

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
      weightCategory: true,
      positions: {
        include: {
          registration: {
            select: {
              id: true,
              awarded: true,
              guestName: true,
              athlete: {
                include: { user: { select: { id: true, name: true } } },
              },
              team: { select: { id: true, name: true } },
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
