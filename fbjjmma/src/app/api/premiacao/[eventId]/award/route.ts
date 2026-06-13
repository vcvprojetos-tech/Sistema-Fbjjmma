import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {

  const { eventId } = await params

  try {
    const { registrationId, bracketId, medal, prizePix } = await req.json()

    if (!registrationId) {
      return NextResponse.json({ error: "registrationId obrigatório." }, { status: 400 })
    }

    // Verify registration belongs to this event
    const registration = await prisma.registration.findFirst({
      where: { id: registrationId, eventId },
    })
    if (!registration) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 })
    }

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        awarded: true,
        ...(medal ? { medal } : {}),
        ...(prizePix !== undefined ? { prizePix: prizePix || null } : {}),
      },
    })

    // Server-side: determine if all placements are now awarded and mark bracket PREMIADA
    if (bracketId) {
      const bracket = await prisma.bracket.findUnique({
        where: { id: bracketId },
        include: {
          positions: {
            include: { registration: { select: { id: true, awarded: true } } },
            orderBy: { position: "asc" },
          },
          matches: { orderBy: [{ round: "asc" }, { matchNumber: "asc" }] },
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bracketAny = bracket as any
      if (bracket && bracket.status !== "PREMIADA") {
        const positions = bracket.positions
        const matches = bracket.matches
        const realMatches = matches.filter((m) => m.position1Id !== null && m.position2Id !== null)
        const maxRound = realMatches.length > 0 ? Math.max(...realMatches.map((m) => m.round)) : 0
        const finalMatch = realMatches.find((m) => m.round === maxRound && m.matchNumber === 1 && m.winnerId)
          ?? realMatches.find((m) => m.round === maxRound && m.winnerId)
          ?? realMatches.find((m) => m.round === maxRound && m.matchNumber === 1)
          ?? realMatches.find((m) => m.round === maxRound)

        // Chave de 1 atleta: partida solo (position2Id = null)
        const soloMatch = matches.find((m) => m.position1Id !== null && m.position2Id === null && m.winnerId !== null)
        if (soloMatch?.winnerId && !finalMatch) {
          await prisma.bracket.update({
            where: { id: bracketId },
            data: { status: "PREMIADA" },
          })
        }

        if (finalMatch?.winnerId) {
          const placementIds: string[] = []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allMatches: any[] = matches

          placementIds.push(finalMatch.winnerId)

          // 2° lugar: só inclui se a final não foi W.O. e o perdedor não foi W.O.'d em nenhuma partida
          const secondId =
            finalMatch.winnerId === finalMatch.position1Id
              ? finalMatch.position2Id
              : finalMatch.position1Id
          const secondHadWO = secondId ? allMatches.some((m: { isWO: boolean; endedAt: Date | null; winnerId: string | null; position1Id: string | null; position2Id: string | null }) =>
            m.isWO && m.endedAt && m.winnerId !== secondId &&
            (m.position1Id === secondId || m.position2Id === secondId)
          ) : false
          // Final fantasma: outras partidas reais do mesmo round são W.O. duplos — sem 2° lugar
          const hasDoubleWOAtFinalRound = realMatches.some((m) =>
            m.round === finalMatch.round && m.id !== finalMatch.id && m.isWO && !m.winnerId
          )
          if (secondId && !finalMatch.isWO && !secondHadWO && !hasDoubleWOAtFinalRound) placementIds.push(secondId)

          // Final fantasma: perdedor da única partida real = 3° lugar
          if (hasDoubleWOAtFinalRound) {
            if (secondId && !finalMatch.isWO) placementIds.push(secondId)
          }

          // 3° lugar — depende se é grande final ou chave normal
          else if (bracketAny.isGrandFinal && bracketAny.bracketGroupId) {
            // Grande final: 3° vem das sub-chaves (perdedor da semi do campeão de cada sub-chave)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subBrackets = await (prisma.bracket as any).findMany({
              where: { bracketGroupId: bracketAny.bracketGroupId, isGrandFinal: false },
              include: {
                positions: { include: { registration: { select: { id: true, awarded: true } } } },
                matches: { orderBy: [{ round: "asc" }, { matchNumber: "asc" }] },
              },
            })
            for (const sub of subBrackets) {
              const subReal = sub.matches.filter((m: { position1Id: string | null; position2Id: string | null }) => m.position1Id && m.position2Id)
              const subMax = subReal.length > 0 ? Math.max(...subReal.map((m: { round: number }) => m.round)) : 0
              const subFinal = subReal.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === subMax && m.matchNumber === 1 && m.winnerId)
                ?? subReal.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === subMax && m.winnerId)
                ?? subReal.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === subMax && m.matchNumber === 1)
                ?? subReal.find((m: { round: number; matchNumber: number; winnerId: string | null }) => m.round === subMax)
              if (!subFinal?.winnerId) continue
              const champSemi = subReal.find((m: { round: number; winnerId: string | null }) => m.round === subMax - 1 && m.winnerId === subFinal.winnerId)
              if (!champSemi) continue
              const loserId = champSemi.position1Id === champSemi.winnerId ? champSemi.position2Id : champSemi.position1Id
              if (loserId) placementIds.push(loserId)
            }
          } else if (maxRound > 1) {
            if (positions.length === 3) {
              const thirdPos = positions.find(
                (p) => p.id !== finalMatch.winnerId && p.id !== secondId
              )
              if (thirdPos) {
                // Só inclui 3° se não foi W.O.'d em nenhuma partida
                const thirdHadWO = allMatches.some((m: { isWO: boolean; endedAt: Date | null; winnerId: string | null; position1Id: string | null; position2Id: string | null }) =>
                  m.isWO && m.endedAt && m.winnerId !== thirdPos.id &&
                  (m.position1Id === thirdPos.id || m.position2Id === thirdPos.id)
                )
                if (!thirdHadWO) placementIds.push(thirdPos.id)
              }
            } else {
              const champSemi = realMatches.find(
                (m) => m.round === maxRound - 1 && m.winnerId === finalMatch.winnerId
              )
              // Sem 3° lugar se a semi do campeão teve W.O. ou se não houve semi real
              const semiHadWO = champSemi?.isWO || (!champSemi && allMatches.some((m: { isWO: boolean; endedAt: Date | null }) => m.isWO && m.endedAt))
              if (champSemi && !semiHadWO) {
                const loserId =
                  champSemi.winnerId === champSemi.position1Id
                    ? champSemi.position2Id
                    : champSemi.position1Id
                if (loserId) placementIds.push(loserId)
              }
            }
          }

          // Verifica se todos os colocados já foram premiados
          // Para grande final, precisamos checar também as posições das sub-chaves
          const allPositions = [...positions]
          if (bracketAny.isGrandFinal && bracketAny.bracketGroupId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subBrackets = await (prisma.bracket as any).findMany({
              where: { bracketGroupId: bracketAny.bracketGroupId, isGrandFinal: false },
              include: { positions: { include: { registration: { select: { id: true, awarded: true } } } } },
            })
            for (const sub of subBrackets) allPositions.push(...sub.positions)
          }

          const awardedMap = new Map<string, boolean>()
          for (const pos of allPositions) {
            const isAwarded = pos.registration?.id === registrationId ? true : (pos.registration?.awarded ?? false)
            awardedMap.set(pos.id, isAwarded)
          }

          const allPlacementsAwarded = placementIds.every((id) => awardedMap.get(id) === true)
          if (allPlacementsAwarded) {
            await prisma.bracket.update({
              where: { id: bracketId },
              data: { status: "PREMIADA" },
            })
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao premiar.", detail: msg }, { status: 500 })
  }
}
