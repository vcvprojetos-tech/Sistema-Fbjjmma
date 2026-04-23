import { NextRequest, NextResponse } from "next/server"
import { WOType } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resetBracketAwards, propagateBracket, checkAndCreateGrandFinal } from "@/lib/bracket-utils"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string; matchId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId, matchId } = await params

  try {
    const body = await req.json()
    const { winnerId, isWO, woType } = body

    const bracket = await prisma.bracket.findFirst({ where: { id: bracketId, eventId: id } })
    if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })

    const match = await prisma.match.findFirst({ where: { id: matchId, bracketId } })
    if (!match) return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 })
    if (match.winnerId) return NextResponse.json({ error: "Partida já finalizada." }, { status: 400 })

    if (!winnerId) return NextResponse.json({ error: "Vencedor obrigatório." }, { status: 400 })
    if (winnerId !== match.position1Id && winnerId !== match.position2Id) {
      return NextResponse.json({ error: "Vencedor inválido." }, { status: 400 })
    }

    const loserId = winnerId === match.position1Id ? match.position2Id : match.position1Id

    // Update match result
    await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        isWO: Boolean(isWO),
        woType: woType ? (woType as WOType) : null,
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
      return NextResponse.json({ message: "Resultado registrado." })
    }
    // ── End 3-athlete special bracket ─────────────────────────────────────────

    // Mark loser as eliminated
    if (loserId) {
      await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
    }

    // Trata par ímpar: só avança com W.O. se todas as rodadas anteriores já foram
    // concluídas (sem partidas pendentes que possam criar mais atletas nesta rodada)
    const roundMatches = await prisma.match.findMany({ where: { bracketId, round: match.round } })
    const allRoundDone = roundMatches.every((m) => m.id === matchId || m.winnerId !== null)

    if (allRoundDone) {
      const roundWinners = roundMatches
        .sort((a, b) => a.matchNumber - b.matchNumber)
        .map((m) => (m.id === matchId ? winnerId : m.winnerId))
        .filter(Boolean) as string[]

      if (roundWinners.length % 2 !== 0) {
        const priorPending = await prisma.match.count({
          where: { bracketId, round: { lt: match.round }, winnerId: null },
        })

        if (priorPending === 0) {
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

    return NextResponse.json({ message: "Resultado registrado." })
  } catch (error) {
    console.error("[MATCH PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao registrar resultado." }, { status: 500 })
  }
}
