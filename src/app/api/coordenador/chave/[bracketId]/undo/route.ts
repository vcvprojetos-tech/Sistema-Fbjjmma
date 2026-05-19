import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"
import { propagateBracket } from "@/lib/bracket-utils"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bracketId: string }> }
) {
  const session = await auth()
  const pin = req.headers.get("x-tatame-pin")
  if (!session && !pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { bracketId } = await params

  try {
    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      include: {
        matches: { orderBy: [{ round: "desc" }, { matchNumber: "desc" }] },
        positions: { select: { id: true } },
        tatame: { select: { id: true } },
      },
    })

    if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })
    if (bracket.status === "PREMIADA")
      return NextResponse.json({ error: "Chave já premiada, não é possível desfazer." }, { status: 400 })

    // Partidas com resultado registrado pelo coordenador (2 atletas reais)
    const realResolved = bracket.matches.filter(
      (m) => m.endedAt !== null && m.position2Id !== null
    )
    if (realResolved.length === 0)
      return NextResponse.json({ error: "Nenhum resultado para desfazer." }, { status: 400 })

    // Última partida real registrada (maior round, depois maior matchNumber)
    const lastMatch = realResolved[0] // já ordenado desc

    const totalPositions = bracket.positions.length
    const isThreeAthlete = totalPositions === 3

    // Se a chave está FINALIZADA e tem grande final criada, verificar se ela já tem resultados
    if (bracket.status === "FINALIZADA" && bracket.bracketGroupId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grandFinal = await (prisma as any).bracket.findFirst({
        where: { bracketGroupId: bracket.bracketGroupId, isGrandFinal: true },
        include: { matches: { where: { endedAt: { not: null } } } },
      })
      if (grandFinal && grandFinal.matches.length > 0) {
        return NextResponse.json(
          { error: "Desfaça a Grande Final antes de reverter esta chave." },
          { status: 400 }
        )
      }
      // Grande final sem resultados: apagar para liberar a reversão
      if (grandFinal) {
        await prisma.match.deleteMany({ where: { bracketId: grandFinal.id } })
        await prisma.bracketPosition.deleteMany({ where: { bracketId: grandFinal.id } })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).bracket.delete({ where: { id: grandFinal.id } })
      }
    }

    // Determina o perdedor da partida para restaurar isEliminated
    const isDoubleWO = lastMatch.isWO && lastMatch.winnerId === null
    const loserId = isDoubleWO
      ? null
      : lastMatch.winnerId === lastMatch.position1Id
      ? lastMatch.position2Id
      : lastMatch.position1Id

    // Reseta o resultado da partida
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.match as any).update({
      where: { id: lastMatch.id },
      data: {
        winnerId: null,
        isWO: false,
        woType: null,
        woWeight1: null,
        woWeight2: null,
        woReason: null,
        endedAt: null,
      },
    })

    // Restaura isEliminated do(s) perdedor(es)
    if (isDoubleWO) {
      const ids = [lastMatch.position1Id, lastMatch.position2Id].filter(Boolean) as string[]
      if (ids.length > 0) {
        await prisma.bracketPosition.updateMany({
          where: { id: { in: ids } },
          data: { isEliminated: false },
        })
      }
    } else if (loserId) {
      await prisma.bracketPosition.update({
        where: { id: loserId },
        data: { isEliminated: false },
      })
    }

    // Apaga partidas criadas em cascata (rounds superiores ao da partida desfeita)
    await prisma.match.deleteMany({
      where: { bracketId, round: { gt: lastMatch.round } },
    })

    // Para chave de 3 atletas no R1: reabre a partida solo de check-in (R1 matchNumber 2)
    // que foi fechada automaticamente quando R1 matchNumber 1 foi registrado
    if (isThreeAthlete && lastMatch.round === 1) {
      await prisma.match.updateMany({
        where: {
          bracketId,
          round: 1,
          matchNumber: { not: 1 },
          position2Id: null,
          endedAt: { not: null },
        },
        data: { winnerId: null, endedAt: null },
      })
    }

    // Reverte status da chave se estava FINALIZADA
    if (bracket.status === "FINALIZADA") {
      await prisma.bracket.update({
        where: { id: bracketId },
        data: { status: "EM_ANDAMENTO" },
      })
    }

    // Para chaves regulares (não 3 atletas), recria cascata válida a partir dos rounds ainda resolvidos
    if (!isThreeAthlete) {
      await propagateBracket(bracketId)
    }

    if (bracket.tatame?.id) notifyTatame(bracket.tatame.id)
    return NextResponse.json({ message: "Resultado desfeito com sucesso." })
  } catch (error) {
    console.error("[COORD UNDO ERROR]", error)
    return NextResponse.json({ error: "Erro ao desfazer resultado." }, { status: 500 })
  }
}
