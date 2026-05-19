import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {

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
              prizePix: true,
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

  // Remove chaves sem campeão (todos eliminados = W.O. sem vencedor) — não precisam de premiação
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semCampeao = brackets.filter((b: any) => b.positions.every((p: { isEliminated: boolean }) => p.isEliminated))
  if (semCampeao.length > 0) {
    await prisma.bracket.updateMany({
      where: { id: { in: semCampeao.map((b: { id: string }) => b.id) } },
      data: { status: "PREMIADA" },
    })
    for (const b of semCampeao) b.status = "PREMIADA"
  }

  // Filtra completamente as chaves sem campeão da resposta (não devem aparecer na tela de premiação)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bracketsComCampeao = brackets.filter((b: any) => b.positions.some((p: { isEliminated: boolean }) => !p.isEliminated))

  // Auto-promover brackets FINALIZADA onde todos os colocados já foram premiados
  const travados = bracketsComCampeao.filter((b: { id: string; status: string; positions: { id: string; registration: { awarded: boolean } | null }[]; matches: { position1Id: string | null; position2Id: string | null; winnerId: string | null; isWO: boolean }[] }) => {
    if (b.status !== "FINALIZADA") return false
    const regs = b.positions.map((p: { registration: { awarded: boolean } | null }) => p.registration).filter(Boolean)
    if (regs.length === 0) return false
    return regs.every((r: { awarded: boolean } | null) => r?.awarded)
  })
  if (travados.length > 0) {
    await prisma.bracket.updateMany({
      where: { id: { in: travados.map((b: { id: string }) => b.id) } },
      data: { status: "PREMIADA" },
    })
    for (const b of travados) b.status = "PREMIADA"
  }

  return NextResponse.json({ event, brackets: bracketsComCampeao })
}
