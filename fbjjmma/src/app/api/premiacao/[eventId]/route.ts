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

  // Remove chaves sem campeão — não precisam de premiação.
  // Dois critérios: todos eliminados (isEliminated) OU nenhuma partida real tem vencedor (todos W.O. duplos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semCampeao = brackets.filter((b: any) => {
    if (b.positions.every((p: { isEliminated: boolean }) => p.isEliminated)) return true
    const realMatches = b.matches.filter((m: { position1Id: string | null; position2Id: string | null }) => m.position1Id && m.position2Id)
    if (realMatches.length > 0 && realMatches.every((m: { winnerId: string | null }) => m.winnerId === null)) return true
    return false
  })
  if (semCampeao.length > 0) {
    await prisma.bracket.updateMany({
      where: { id: { in: semCampeao.map((b: { id: string }) => b.id) } },
      data: { status: "PREMIADA" },
    })
    for (const b of semCampeao) b.status = "PREMIADA"
  }

  // Filtra completamente as chaves sem campeão da resposta (não devem aparecer na tela de premiação)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const semCampeaoIds = new Set(semCampeao.map((b: { id: string }) => b.id))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bracketsComCampeao = brackets.filter((b: any) => !semCampeaoIds.has(b.id))

  // Auto-promover brackets FINALIZADA onde todos os COLOCADOS REAIS já foram premiados.
  // Usa a mesma lógica de computePlacements: exclui W.O.'d do 2°/3° lugar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const travados = bracketsComCampeao.filter((b: any) => {
    if (b.status !== "FINALIZADA") return false
    const realMs = b.matches.filter((m: { position1Id: string | null; position2Id: string | null }) => m.position1Id && m.position2Id)
    if (realMs.length === 0) return false
    const maxRound = Math.max(...realMs.map((m: { round: number }) => m.round))
    const finalM = realMs.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === maxRound && m.matchNumber === 1 && m.winnerId)
      ?? realMs.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === maxRound && m.winnerId)
      ?? realMs.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === maxRound && m.matchNumber === 1)
      ?? realMs.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === maxRound)
    if (!finalM?.winnerId) return false

    // Coleta os IDs de posição que realmente têm colocação (mesmo critério do award route)
    const pIds: string[] = [finalM.winnerId]
    const secondId = finalM.winnerId === finalM.position1Id ? finalM.position2Id : finalM.position1Id
    const secondHadWO = secondId ? b.matches.some((m: { isWO: boolean; endedAt: unknown; winnerId: string | null; position1Id: string | null; position2Id: string | null }) =>
      m.isWO && m.endedAt && m.winnerId !== secondId &&
      (m.position1Id === secondId || m.position2Id === secondId)
    ) : false
    // Final fantasma: outras partidas reais do mesmo round são W.O. duplos — sem 2° lugar, perdedor é 3°
    const hasDoubleWOAtFinalRound = realMs.some((m: { round: number; id: string; isWO: boolean; winnerId: string | null }) =>
      m.round === finalM.round && m.id !== finalM.id && m.isWO && !m.winnerId
    )
    if (secondId && !finalM.isWO && !secondHadWO && !hasDoubleWOAtFinalRound) pIds.push(secondId)
    if (hasDoubleWOAtFinalRound && secondId && !finalM.isWO) pIds.push(secondId)

    if (!hasDoubleWOAtFinalRound && maxRound > 1) {
      if (b.positions.length === 3) {
        const thirdPos = b.positions.find((p: { id: string }) => p.id !== finalM.winnerId && p.id !== secondId)
        if (thirdPos) {
          const thirdHadWO = b.matches.some((m: { isWO: boolean; endedAt: unknown; winnerId: string | null; position1Id: string | null; position2Id: string | null }) =>
            m.isWO && m.endedAt && m.winnerId !== thirdPos.id &&
            (m.position1Id === thirdPos.id || m.position2Id === thirdPos.id)
          )
          if (!thirdHadWO) pIds.push(thirdPos.id)
        }
      } else {
        const champSemi = realMs.find((m: { round: number; winnerId: string | null }) => m.round === maxRound - 1 && m.winnerId === finalM.winnerId)
        const semiHadWO = champSemi?.isWO || (!champSemi && b.matches.some((m: { isWO: boolean; endedAt: unknown }) => m.isWO && m.endedAt))
        if (champSemi && !semiHadWO) {
          const loserId = champSemi.winnerId === champSemi.position1Id ? champSemi.position2Id : champSemi.position1Id
          if (loserId) pIds.push(loserId)
        }
      }
    }

    const posMap = new Map(b.positions.map((p: { id: string; registration: { awarded: boolean } | null }) => [p.id, p]))
    return pIds.every(id => (posMap.get(id) as { registration: { awarded: boolean } | null } | undefined)?.registration?.awarded === true)
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
