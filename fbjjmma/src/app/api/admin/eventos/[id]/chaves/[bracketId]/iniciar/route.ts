import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resetBracketAwards, propagateBracket, checkAndCreateGrandFinal } from "@/lib/bracket-utils"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const { id, bracketId } = await params

  try {
    const bracket = await prisma.bracket.findFirst({
      where: { id: bracketId, eventId: id },
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

    // Delete any existing matches
    await prisma.match.deleteMany({ where: { bracketId } })

    // Special case: only 1 athlete — bracket finishes immediately
    if (positions.length === 1) {
      await resetBracketAwards(bracketId)
      await prisma.bracket.update({ where: { id: bracketId }, data: { status: "FINALIZADA" } })
      await checkAndCreateGrandFinal(bracketId)
      return NextResponse.json({ message: "Chave finalizada (único atleta)." })
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
        },
      })
      await prisma.bracket.update({ where: { id: bracketId }, data: { status: "EM_ANDAMENTO" } })
      return NextResponse.json({ message: "Chave iniciada." })
    }

    // Generate round 1 matches using standard bracket seeding.
    // For N athletes in a bracket of size P (next power of 2):
    // - Odd seeds (1,3,...) occupy the left half and fight their mirror (+P/2)
    // - Even seeds (2,4,...) occupy the right half and fight their mirror (+P/2)
    // Example for N=6, P=8: (1v5), (3vBYE), (2v6), (4vBYE)
    const n = positions.length
    let p = 1
    while (p < n) p *= 2
    const half = p / 2

    // Build ordered seed pairs: left matches first (odd seeds), then right (even seeds)
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
          // Auto-win when opponent slot is a bye
          ...(pos1 !== null && pos2 === null && {
            winnerId: pos1.id,
            isWO: true,
            woType: "AUSENCIA",
            endedAt: new Date(),
          }),
        },
      })
    }

    await prisma.bracket.update({ where: { id: bracketId }, data: { status: "EM_ANDAMENTO" } })

    // Propaga W.O.s: cria partidas das rodadas seguintes que já têm ambos atletas definidos
    await propagateBracket(bracketId)

    return NextResponse.json({ message: "Chave iniciada." })
  } catch (error) {
    console.error("[INICIAR ERROR]", error)
    return NextResponse.json({ error: "Erro ao iniciar chave." }, { status: 500 })
  }
}
