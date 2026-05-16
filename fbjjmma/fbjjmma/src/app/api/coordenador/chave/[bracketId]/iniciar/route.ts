import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyTatame } from "@/lib/tatame-events"
import { propagateBracket } from "@/lib/bracket-utils"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bracketId: string }> }
) {
  const session = await auth()
  const pin = _req.headers.get("x-tatame-pin")
  if (!session && !pin) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { bracketId } = await params

  try {
    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      include: {
        positions: { orderBy: { position: "asc" } },
        matches: true,
      },
    })

    if (!bracket) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 })
    if (bracket.status === "EM_ANDAMENTO" || bracket.status === "FINALIZADA") {
      return NextResponse.json({ error: "Chave já iniciada." }, { status: 400 })
    }

    const positions = bracket.positions
    if (positions.length === 0) return NextResponse.json({ error: "Chave sem atletas." }, { status: 400 })

    await prisma.match.deleteMany({ where: { bracketId } })

    const now = new Date()
    const primeiraChamada = [{ call: 1, at: now.toISOString(), pos: null }]

    if (positions.length === 1) {
      // Cria partida solo para pesagem — coordenador declara campeão ou W.O. manualmente
      await prisma.match.create({
        data: {
          bracketId,
          round: 1,
          matchNumber: 1,
          position1Id: positions[0].id,
          position2Id: null,
          callTimes: primeiraChamada,
        },
      })
      await prisma.bracket.update({ where: { id: bracketId }, data: { status: "EM_ANDAMENTO" } })
      if (bracket.tatameId) notifyTatame(bracket.tatameId)
      return NextResponse.json({ message: "Chave iniciada." })
    }

    // 3-athlete FBJJMMA special bracket (rule 2.3):
    // Match 1: pos1 vs pos2. Match 2: loser vs pos3. Final: winner(M1) vs winner(M2).
    if (positions.length === 3) {
      // Match 1: pos 1 vs pos 3. pos 2 waits.
      // Loser of Match 1 faces pos 2 in Match 2 (repescagem).
      await prisma.match.create({
        data: {
          bracketId,
          round: 1,
          matchNumber: 1,
          position1Id: positions[0].id, // pos 1
          position2Id: positions[2].id, // pos 3
          callTimes: primeiraChamada,
        },
      })
      // Partida solo para pos 2 (atleta que aguarda) — permite check-in e aparece no painel
      await prisma.match.create({
        data: {
          bracketId,
          round: 1,
          matchNumber: 2,
          position1Id: positions[1].id, // pos 2 aguarda
          position2Id: null,
          callTimes: primeiraChamada,
        },
      })
      await prisma.bracket.update({ where: { id: bracketId }, data: { status: "EM_ANDAMENTO" } })
      if (bracket.tatameId) notifyTatame(bracket.tatameId)
      return NextResponse.json({ message: "Chave iniciada." })
    }

    // Standard bracket seeding: odd seeds on left half, even seeds on right half,
    // each fights their mirror (+P/2). Example N=6,P=8: (1v5),(3vBYE),(2v6),(4vBYE)
    const n = positions.length
    let p = 1
    while (p < n) p *= 2
    const half = p / 2

    const seedPairs: [number, number][] = []
    for (let seed = 1; seed <= half; seed += 2) seedPairs.push([seed, seed + half])
    for (let seed = 2; seed <= half; seed += 2) seedPairs.push([seed, seed + half])

    let matchNumber = 1
    for (const [s1, s2] of seedPairs) {
      const pos1 = s1 <= n ? positions[s1 - 1] : null
      const pos2 = s2 <= n ? positions[s2 - 1] : null

      if (!pos1 && !pos2) continue

      await prisma.match.create({
        data: {
          bracketId,
          round: 1,
          matchNumber: matchNumber++,
          position1Id: pos1?.id ?? null,
          position2Id: pos2?.id ?? null,
          callTimes: primeiraChamada,
        },
      })
    }

    await prisma.bracket.update({ where: { id: bracketId }, data: { status: "EM_ANDAMENTO" } })

    // Propaga W.O.s: cria partidas das rodadas seguintes que já têm ambos atletas definidos
    await propagateBracket(bracketId)

    if (bracket.tatameId) notifyTatame(bracket.tatameId)
    return NextResponse.json({ message: "Chave iniciada." })
  } catch (error) {
    console.error("[COORD INICIAR ERROR]", error)
    return NextResponse.json({ error: "Erro ao iniciar chave." }, { status: 500 })
  }
}
