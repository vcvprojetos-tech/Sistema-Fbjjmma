import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    const { prizePix } = await req.json()

    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, eventId: id },
      include: {
        positions: { select: { id: true, registrationId: true } },
        matches: { orderBy: [{ round: "asc" }, { matchNumber: "asc" }] },
      },
    })

    if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })
    if (!bracket.isAbsolute) return NextResponse.json({ error: "Esta chave não é absoluto." }, { status: 400 })

    // Determina a posição do campeão
    const realMatches = bracket.matches.filter(m => m.position1Id && m.position2Id)
    let championPositionId: string | null = null

    if (realMatches.length > 0) {
      const maxRound = Math.max(...realMatches.map(m => m.round))
      const finalMatch = realMatches.find(m => m.round === maxRound && m.matchNumber === 1)
      championPositionId = finalMatch?.winnerId ?? null
    } else {
      // Chave solo (1 atleta): partida com position2Id null
      const soloMatch = bracket.matches.find(m => m.position1Id && !m.position2Id && m.winnerId)
      championPositionId = soloMatch?.winnerId ?? null
    }

    // Fallback: chave com 1 posição (atleta solo sem partida iniciada)
    if (!championPositionId && bracket.positions.length === 1) {
      championPositionId = bracket.positions[0].id
    }

    if (!championPositionId) {
      return NextResponse.json({ error: "Campeão ainda não definido nesta chave." }, { status: 400 })
    }

    const championPos = bracket.positions.find(p => p.id === championPositionId)
    if (!championPos?.registrationId) {
      return NextResponse.json({ error: "Posição do campeão sem atleta." }, { status: 400 })
    }

    await prisma.registration.update({
      where: { id: championPos.registrationId },
      data: { prizePix: prizePix?.trim() || null },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[BRACKET PIX ERROR]", error)
    return NextResponse.json({ error: "Erro ao salvar PIX." }, { status: 500 })
  }
}
