import { NextRequest, NextResponse } from "next/server"
import { WOType } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"
import { propagateBracket, resetBracketAwards, checkAndCreateGrandFinal } from "@/lib/bracket-utils"
import { saveBackupFile } from "@/lib/event-backup"

async function finalizeBracket(bracketId: string) {
  await resetBracketAwards(bracketId)
  const bracket = await prisma.bracket.update({
    where: { id: bracketId },
    data: { status: "FINALIZADA" },
    select: { eventId: true },
  })
  await checkAndCreateGrandFinal(bracketId)
  // Salva snapshot em disco — persiste mesmo se os dados do banco forem apagados
  saveBackupFile(bracket.eventId).catch(() => {})
}

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
    const { winnerId, isWO, woType, woWeight, woReason } = body

    const [match, bracketRecord] = await Promise.all([
      prisma.match.findFirst({ where: { id: matchId, bracketId } }),
      prisma.bracket.findUnique({ where: { id: bracketId }, select: { tatameId: true } }),
    ])
    if (!match) return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 })
    if (match.winnerId) return NextResponse.json({ error: "Partida já finalizada." }, { status: 400 })

    // Chave com 1 atleta: position2Id é null
    const isSoloMatch = match.position2Id === null

    if (isSoloMatch) {
      if (isWO) {
        // Atleta tomou W.O.: atualiza match e propaga (pode ser mid-bracket solo criado por duplo W.O.)
        await prisma.match.update({
          where: { id: matchId },
          data: {
            winnerId: null,
            isWO: true,
            woType: woType ? (woType as WOType) : "AUSENCIA",
            ...(woWeight != null && woType === "PESO" && { woWeight1: Number(woWeight) }),
            endedAt: new Date(),
          },
        })
      } else {
        // Campeão confirmado
        if (!match.position1Id) return NextResponse.json({ error: "Atleta não encontrado." }, { status: 400 })
        await prisma.match.update({
          where: { id: matchId },
          data: { winnerId: match.position1Id, isWO: false, endedAt: new Date() },
        })
      }
      // Propaga: pode haver rodadas seguintes (ex: solo criado por W.O. duplo no meio da chave)
      const finished = await propagateBracket(bracketId)
      if (finished) {
        await finalizeBracket(bracketId)
      }
      if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
      return NextResponse.json({ message: isWO ? "Atleta desclassificado." : "Campeão declarado." })
    }

    // W.O. duplo: ambos ausentes, nenhum avança
    const isDoubleWO = Boolean(isWO) && (!winnerId || winnerId === "") && !isSoloMatch
    if (isDoubleWO) {
      await prisma.$transaction([
        prisma.match.update({
          where: { id: matchId },
          data: { winnerId: null, isWO: true, woType: "AUSENCIA", endedAt: new Date() },
        }),
        ...(match.position1Id
          ? [prisma.bracketPosition.update({ where: { id: match.position1Id }, data: { isEliminated: true } })]
          : []),
        ...(match.position2Id
          ? [prisma.bracketPosition.update({ where: { id: match.position2Id }, data: { isEliminated: true } })]
          : []),
      ])
      const finished = await propagateBracket(bracketId)
      if (finished) {
        await finalizeBracket(bracketId)
      }
      if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
      return NextResponse.json({ message: "Dupla ausência registrada." })
    }

    if (!winnerId) return NextResponse.json({ error: "Vencedor obrigatório." }, { status: 400 })
    if (winnerId !== match.position1Id && winnerId !== match.position2Id) {
      return NextResponse.json({ error: "Vencedor inválido." }, { status: 400 })
    }

    const loserId = winnerId === match.position1Id ? match.position2Id : match.position1Id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.match as any).update({
      where: { id: matchId },
      data: {
        winnerId,
        isWO: Boolean(isWO),
        woType: woType ? (woType as WOType) : null,
        woReason: woReason ?? null,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchAny = prisma.match as any
      if (match.round === 1) {
        // Loser gets a second chance — do NOT mark as eliminated
        const thirdPosition = await prisma.bracketPosition.findFirst({
          where: {
            bracketId,
            id: { notIn: [match.position1Id, match.position2Id].filter(Boolean) as string[] },
          },
        })

        // Fecha a partida solo de check-in do atleta em espera (R1 matchNumber 2)
        // para que não apareça mais como luta pendente na tela do coordenador
        await prisma.match.updateMany({
          where: {
            bracketId,
            round: 1,
            matchNumber: { not: match.matchNumber },
            position2Id: null,
            winnerId: null,
            endedAt: null,
          },
          data: {
            winnerId: thirdPosition!.id,
            endedAt: new Date(),
          },
        })

        // Verifica se o atleta em espera já foi W.O.'d na partida solo de check-in
        const thirdAlreadyWO = await prisma.match.findFirst({
          where: {
            bracketId,
            position1Id: thirdPosition!.id,
            position2Id: null,
            isWO: true,
            endedAt: { not: null },
          },
        })

        if (isWO && loserId) {
          // W.O. no R1 (ex: desclassificação por peso ou ausência): o perdedor está fora.
          if (thirdAlreadyWO) {
            // Atleta em espera também já foi W.O.'d: vencedor do R1 é campeão direto (solo)
            await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
            await matchAny.create({
              data: { bracketId, round: 3, matchNumber: 1, position1Id: winnerId, position2Id: null, p1CheckedIn: true },
            })
          } else {
            // Atleta em espera está disponível: vai direto para a final contra o vencedor do R1
            await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
            await matchAny.create({
              data: { bracketId, round: 3, matchNumber: 1, position1Id: winnerId, position2Id: thirdPosition!.id, p1CheckedIn: true },
            })
          }
        } else if (thirdAlreadyWO) {
          // Resultado normal no R1, mas atleta em espera já foi W.O.'d:
          // perdedor do R1 é eliminado, vencedor é campeão direto (solo)
          if (loserId) {
            await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
          }
          await matchAny.create({
            data: { bracketId, round: 3, matchNumber: 1, position1Id: winnerId, position2Id: null, p1CheckedIn: true },
          })
        } else {
          // Resultado normal: perdedor do R1 tem segunda chance contra o atleta em espera
          await matchAny.create({
            data: {
              bracketId,
              round: 2,
              matchNumber: 1,
              position1Id: loserId ?? null,
              position2Id: thirdPosition!.id,
              p1CheckedIn: !!loserId,
            },
          })
        }
      } else if (match.round === 2) {
        // Loser of round 2 = 3rd place
        if (loserId) {
          await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
        }
        // matchNumber: 1 garante que pegamos o combate real, não a partida solo de check-in (matchNumber: 2)
        const round1Match = await prisma.match.findFirst({ where: { bracketId, round: 1, matchNumber: 1 } })
        // Ambos os finalistas já jogaram rodadas anteriores — ambos confirmados
        await matchAny.create({
          data: {
            bracketId,
            round: 3,
            matchNumber: 1,
            position1Id: round1Match!.winnerId!,
            position2Id: winnerId,
            p1CheckedIn: true,
            p2CheckedIn: true,
          },
        })
      } else {
        // Round 3 = Final: mark loser (2nd place) and finalize
        if (loserId) {
          await prisma.bracketPosition.update({ where: { id: loserId }, data: { isEliminated: true } })
        }
        await finalizeBracket(bracketId)
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
      await finalizeBracket(bracketId)
    }

    if (bracketRecord?.tatameId) notifyTatame(bracketRecord.tatameId)
    return NextResponse.json({ message: "Resultado registrado." })
  } catch (error) {
    console.error("[COORD MATCH PUT ERROR]", error)
    return NextResponse.json({ error: "Erro ao registrar resultado." }, { status: 500 })
  }
}
