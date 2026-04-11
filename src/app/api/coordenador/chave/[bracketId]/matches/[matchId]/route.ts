import { NextRequest, NextResponse } from "next/server"
import { WOType } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"
import { resetBracketAwards, propagateBracket, checkAndCreateGrandFinal } from "@/lib/bracket-utils"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bracketId: string; matchId: string }> }
) {
  const session = await auth()
  const pin = req.headers.get("x-tatame-pin")
  if (!session && !pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { bracketId, matchId } = await params

  try {
    const body = await req.json()
    const { winnerId, isWO, woType, woWeight } = body

    const [match, bracketRecord] = await Promise.all([
      prisma.match.findFirst({ where: { id: matchId, bracketId } }),
      prisma.bracket.findUnique({ where: { id: bracketId }, select: { tatameId: true } }),
    ])
    if (!match) return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 })
    if (match.winnerId) return NextResponse.json({ error: "Partida já finalizada." }, { status: 400 })

    // Chave com 1 atleta: position2Id é null
    const isSoloMatch = match.position2Id === null

    if (isSoloMatch) {
      // W.O. no único atleta: finaliza sem campeão
      if (isWO) {
        await prisma.match.update({
          where: { id: matchId },
          data: {
            winnerId: null,
            isWO: true,
            woType: woType ? (woType as WOType) : null,
            ...(woWeight != null && woType === "PESO" && { woWeight1: Number(woWeight) }),
            endedAt: new Date(),
          },
        })
        await prisma.bracket.update({ where: { id: bracketId }, data: { status: "FINALIZADA" } })
        if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
        return NextResponse.json({ message: "Atleta desclassificado. Chave finalizada sem campeão." })
      }
      // Campeão confirmado: usa position1Id como vencedor
      if (!match.position1Id) return NextResponse.json({ error: "Atleta não encontrado." }, { status: 400 })
      await prisma.match.update({
        where: { id: matchId },
        data: { winnerId: match.position1Id, isWO: false, endedAt: new Date() },
      })
      await resetBracketAwards(bracketId)
      await prisma.bracket.update({ where: { id: bracketId }, data: { status: "FINALIZADA" } })
      await checkAndCreateGrandFinal(bracketId)
      if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
      return NextResponse.json({ message: "Campeão declarado. Chave finalizada." })
    }

    if (!winnerId) return NextResponse.json({ error: "Vencedor obrigatório." }, { status: 400 })
    if (winnerId !== match.position1Id && winnerId !== match.position2Id) {
      return NextResponse.json({ error: "Vencedor inválido." }, { status: 400 })
    }

    const loserId = winnerId === match.position1Id ? match.position2Id : match.position1Id

    await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        isWO: Boolean(isWO),
        woType: woType ? (woType as WOType) : null,
        // Se desclassificação por peso, salva o peso no campo do perdedor
        ...(woWeight != null && woType === "PESO" && {
          [winnerId === match.position1Id ? "woWeight2" : "woWeight1"]: Number(woWeight),
        }),
        endedAt: new Date(),
      },
    })

    // ── 3-athlete FBJJMMA special bracket (rule 2.3) ──────────────────────────
    // Round 1: A vs B → winner waits for final, loser fights C in round 2
    // Round 2: loser(R1) vs C → loser is 3rd place, create final
    // Round 3: winner(R1) vs winner(R2) → final, finalize bracket
    const totalPositions = await prisma.bracketPosition.count({ where: { bracketId } })

    if (totalPositions === 3) {
      if (match.round === 1) {
        // Loser gets a second chance — do NOT mark as eliminated
        const thirdPosition = await prisma.bracketPosition.findFirst({
          where: {
            bracketId,
            id: { notIn: [match.position1Id, match.position2Id].filter(Boolean) as string[] },
          },
        })
        await prisma.match.create({
          data: {
            bracketId,
            round: 2,
            matchNumber: 1,
            position1Id: loserId ?? null,
            position2Id: thirdPosition!.id,
          },
        })
      } else if (match.round === 2) {
        // Loser of round 2 = 3rd place
        if (loserId) {
          await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
        }
        const round1Match = await prisma.match.findFirst({ where: { bracketId, round: 1 } })
        await prisma.match.create({
          data: {
            bracketId,
            round: 3,
            matchNumber: 1,
            position1Id: round1Match!.winnerId!,
            position2Id: winnerId,
          },
        })
      } else {
        // Round 3 = Final: mark loser (2nd place) and finalize
        if (loserId) {
          await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
        }
        await resetBracketAwards(bracketId)
        await prisma.bracket.update({ where: { id: bracketId }, data: { status: "FINALIZADA" } })
        await checkAndCreateGrandFinal(bracketId)
      }
      if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
      return NextResponse.json({ message: "Resultado registrado." })
    }
    // ── End 3-athlete special bracket ─────────────────────────────────────────

    if (loserId) {
      await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
    }

    // Trata par ímpar: se todos os vencedores da rodada atual são conhecidos E todas
    // as rodadas anteriores já foram concluídas (garantindo que não virão mais atletas
    // para esta rodada), avança o último atleta sem par com W.O.
    const roundMatches = await prisma.match.findMany({ where: { bracketId, round: match.round } })
    const allRoundDone = roundMatches.every((m) => m.id === matchId || m.winnerId !== null)

    if (allRoundDone) {
      const roundWinners = roundMatches
        .sort((a, b) => a.matchNumber - b.matchNumber)
        .map((m) => (m.id === matchId ? winnerId : m.winnerId))
        .filter(Boolean) as string[]

      if (roundWinners.length % 2 !== 0) {
        // Verifica se ainda há partidas pendentes em rodadas anteriores
        // (que poderiam criar mais partidas nesta rodada)
        const priorPending = await prisma.match.count({
          where: { bracketId, round: { lt: match.round }, winnerId: null },
        })

        if (priorPending === 0) {
          // Rodadas anteriores completas: par ímpar confirmado, avança com W.O.
          const lastWinner = roundWinners[roundWinners.length - 1]
          const nextRound = match.round + 1
          const nextMN = Math.ceil(roundWinners.length / 2)
          const existingNext = await prisma.match.findFirst({
            where: { bracketId, round: nextRound, matchNumber: nextMN },
          })
          if (!existingNext) {
            await prisma.match.create({
              data: {
                bracketId, round: nextRound, matchNumber: nextMN,
                position1Id: lastWinner, position2Id: null,
                winnerId: lastWinner, isWO: true, woType: "AUSENCIA", endedAt: new Date(),
              },
            })
          }
        }
      }
    }

    // Propaga: cria partidas das rodadas seguintes cujos dois atletas já estão definidos
    const finished = await propagateBracket(bracketId)
    if (finished) {
      await resetBracketAwards(bracketId)
      await prisma.bracket.update({ where: { id: bracketId }, data: { status: "FINALIZADA" } })
      await checkAndCreateGrandFinal(bracketId)
    }

    if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
    return NextResponse.json({ message: "Resultado registrado." })
  } catch (error) {
    console.error("[COORD MATCH PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao registrar resultado." }, { status: 500 })
  }
}
